import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { glob } from 'glob'
import postcss from 'postcss'
import postcssModules from 'postcss-modules'
import * as sass from 'sass'

export interface GeneratorOptions {
  pattern: string
  output?: string
  watch?: boolean
  exportType?: 'default' | 'named' | 'both'
  nameFormat?: 'camelCase' | 'dashes' | 'original'
  debug?: boolean
}

export class CssModulesTypesGenerator {
  private readonly options: Required<GeneratorOptions>

  constructor(options: GeneratorOptions) {
    this.options = {
      pattern: options.pattern,
      output: options.output || 'auto',
      watch: options.watch || false,
      exportType: options.exportType || 'default',
      nameFormat: options.nameFormat || 'camelCase',
      debug: options.debug || false,
    }
  }

  /**
   * Generate type definitions for CSS/SCSS files matching the provided glob pattern.
   * @returns Promise that resolves when generation is complete
   */
  async generate(): Promise<void> {
    if (this.options.debug) {
      console.info(`Using glob pattern: "${this.options.pattern}"`)
    }

    const files = await glob(this.options.pattern)

    if (this.options.debug) {
      console.info(`Found ${files.length} matching files:`)
      for (const file of files) {
        console.info(`- ${file}`)
      }
    }

    for (const file of files) {
      await this.processFile(file)
    }
  }

  /**
   * Process a single CSS/SCSS file and generate type definitions.
   * @param filePath Path to the CSS/SCSS file to process
   * @returns Promise that resolves when processing is complete
   * @throws Error if file processing fails
   */
  private async processFile(filePath: string): Promise<void> {
    try {
      if (this.options.debug) {
        console.info(`Processing file: ${filePath}`)
      }

      const ext = path.extname(filePath)
      let css: string

      if (ext === '.scss' || ext === '.sass') {
        if (this.options.debug) {
          console.info(`Compiling SCSS file: ${filePath}`)
        }
        const result = sass.compile(filePath)
        css = result.css
      } else {
        if (this.options.debug) {
          console.info(`Reading CSS file: ${filePath}`)
        }
        css = fs.readFileSync(filePath, 'utf8')
      }

      const classNames = new Set<string>()

      await postcss([
        postcssModules({
          getJSON: (cssFileName: string, json: Record<string, string>) => {
            Object.keys(json).forEach((key) => classNames.add(key))
          },
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        }),
      ]).process(css, { from: filePath })

      const typeDefinition = this.generateTypeDefinition(classNames)
      const outputPath = this.getOutputPath(filePath)

      const outputDir = path.dirname(outputPath)
      fs.mkdirSync(outputDir, { recursive: true })

      fs.writeFileSync(outputPath, typeDefinition)
      console.info(`Generated types for ${filePath} -> ${outputPath}`)
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error)
    }
  }

  /**
   * Generate TypeScript type definitions from the collected class names.
   * @param classNames Set of class names extracted from the CSS/SCSS file
   * @returns TypeScript type definition as a string
   */
  private generateTypeDefinition(classNames: Set<string>): string {
    const formattedClassNames = Array.from(classNames).map((name) =>
      this.formatClassName(name),
    )

    const classNamesType =
      formattedClassNames.length > 0
        ? formattedClassNames
            .map((name) => `  readonly ${name}: string;`)
            .join('\n')
        : '  readonly [key: string]: string;'

    switch (this.options.exportType) {
      case 'named':
        return String(
          formattedClassNames
            .map((name) => `export declare const ${name}: string;`)
            .join('\n'),
        )

      case 'both':
        return `export interface CssModuleClasses {
${classNamesType}
}

export type ClassNames = keyof CssModuleClasses;

declare const classes: CssModuleClasses;
export default classes;

${formattedClassNames.map((name) => `export const ${name}: string;`).join('\n')}
`

      case 'default':
      default:
        return `export interface CssModuleClasses {
${classNamesType}
}

export type ClassNames = keyof CssModuleClasses;

declare const classes: CssModuleClasses;
export default classes;
`
    }
  }

  /**
   * Format a class name based on the specified naming convention.
   * @param name Class name to format
   * @returns Formatted class name
   */
  private formatClassName(name: string): string {
    switch (this.options.nameFormat) {
      case 'camelCase': {
        // Split on any sequence of dashes or underscores (handles BEM, e.g., __ or --)
        const parts = name.split(/[-_]+/g).filter(Boolean)
        if (parts.length === 0) return name
        const camel = parts
          .map((part, i) => {
            if (i === 0) {
              return /^[A-Z0-9_]+$/.test(part)
                ? part.toLowerCase()
                : part.charAt(0).toLowerCase() + part.slice(1)
            }
            if (/^[A-Z0-9_]+$/.test(part)) {
              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            }
            return part.charAt(0).toUpperCase() + part.slice(1)
          })
          .join('')
        // If the original started with a non-letter, preserve quoting
        return /^[a-z_$][\w$]*$/i.test(camel) ? camel : `'${camel}'`
      }
      case 'dashes':
        return `'${name}'`
      case 'original':
      default:
        return /^[a-z_$][\w$]*$/i.test(name) ? name : `'${name}'`
    }
  }

  /**
   * Get the output path for the generated type definition file.
   * @param filePath Path to the original CSS/SCSS file
   * @returns Output path for the type definition file
   */
  private getOutputPath(filePath: string): string {
    if (this.options.output === 'auto') {
      return `${filePath}.d.ts`
    }

    const relativePath = path.relative(process.cwd(), filePath)
    const outputFileName = `${relativePath}.d.ts`
    return path.join(this.options.output, outputFileName)
  }
}

/**
 * Generate TypeScript type definitions for CSS Modules.
 * @param options Options for the generator
 */
export async function generateCssModuleTypes(
  options: GeneratorOptions,
): Promise<void> {
  const generator = new CssModulesTypesGenerator(options)
  await generator.generate()
}

/**
 * Process a single CSS/SCSS file and generate type definitions.
 * @param filePath Path to the CSS/SCSS file to process
 * @param options Options for the generator
 */
export async function processSingleFile(
  filePath: string,
  options: Omit<GeneratorOptions, 'pattern'>,
): Promise<void> {
  console.info(`Processing single file: ${filePath}`)

  const tempOptions: GeneratorOptions = {
    pattern: filePath,
    ...options,
  }

  const generator = new CssModulesTypesGenerator(tempOptions)

  await generator.generate()
}
