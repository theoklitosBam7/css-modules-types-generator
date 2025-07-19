import * as fs from 'node:fs'
import * as path from 'node:path'
import { glob } from 'glob'
import postcss from 'postcss'
import * as sass from 'sass'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CssModulesTypesGenerator,
  generateCssModuleTypes,
  processSingleFile,
  type GeneratorOptions,
} from '../src/index'

// Mock external dependencies
vi.mock('node:fs')
vi.mock('node:path')
vi.mock('glob')
vi.mock('postcss')
vi.mock('sass')

describe('CssModulesTypesGenerator', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks()

    // Mock path.extname
    vi.mocked(path.extname).mockImplementation((filePath) => {
      return filePath.includes('.scss') ? '.scss' : '.css'
    })

    // Mock path.dirname and path.join
    vi.mocked(path.dirname).mockImplementation(
      (p) => p.split('/').slice(0, -1).join('/') || '.',
    )
    vi.mocked(path.join).mockImplementation((...parts) => parts.join('/'))

    // Mock path.relative
    vi.mocked(path.relative).mockReturnValue('styles/test.css')

    // Mock fs.readFileSync
    vi.mocked(fs.readFileSync).mockReturnValue('.test { color: red; }')

    // Mock fs.writeFileSync
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined)

    // Mock fs.mkdirSync
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined)

    // Mock glob
    vi.mocked(glob).mockResolvedValue(['styles/test.css', 'styles/test.scss'])

    // Mock sass.compile
    vi.mocked(sass.compile).mockReturnValue({
      css: '.test { color: blue; }',
      loadedUrls: [],
      sourceMap: undefined,
    })

    // Mock postcss
    vi.mocked(postcss).mockImplementation(() => {
      return {
        process: vi.fn().mockImplementation((css, options) => {
          // Simulate postcss-modules by calling getJSON with some class names
          const plugins = vi.mocked(postcss).mock.calls[0][0]
          const getJSON = plugins[0].getJSON
          if (getJSON) {
            getJSON(options.from, {
              test: 'test_123',
              'button-primary': 'button-primary_456',
            })
          }
          return Promise.resolve()
        }),
      } as any
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should use default options when not provided', () => {
      const generator = new CssModulesTypesGenerator({ pattern: '**/*.css' })

      // @ts-expect-error - accessing private property for testing
      expect(generator.options).toEqual({
        pattern: '**/*.css',
        output: 'auto',
        watch: false,
        exportType: 'default',
        nameFormat: 'camelCase',
        debug: false,
      })
    })

    it('should use provided options', () => {
      const options: GeneratorOptions = {
        pattern: '**/*.scss',
        output: 'types',
        watch: true,
        exportType: 'named',
        nameFormat: 'dashes',
        debug: true,
      }

      const generator = new CssModulesTypesGenerator(options)

      // @ts-expect-error - accessing private property for testing
      expect(generator.options).toEqual(options)
    })
  })

  describe('generate', () => {
    it('should process all matching files', async () => {
      const generator = new CssModulesTypesGenerator({ pattern: '**/*.css' })
      const processSpy = vi.spyOn(generator as any, 'processFile')

      await generator.generate()

      expect(glob).toHaveBeenCalledWith('**/*.css')
      expect(processSpy).toHaveBeenCalledTimes(2)
      expect(processSpy).toHaveBeenCalledWith('styles/test.css')
      expect(processSpy).toHaveBeenCalledWith('styles/test.scss')
    })

    it('should log debug information when debug is enabled', async () => {
      const generator = new CssModulesTypesGenerator({
        pattern: '**/*.css',
        debug: true,
      })
      const consoleInfoSpy = vi
        .spyOn(console, 'info')
        .mockImplementation(() => {})
      const processSpy = vi.spyOn(generator as any, 'processFile')

      await generator.generate()

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Using glob pattern: "**/*.css"',
      )
      expect(consoleInfoSpy).toHaveBeenCalledWith('Found 2 matching files:')
      expect(consoleInfoSpy).toHaveBeenCalledWith('- styles/test.css')
      expect(consoleInfoSpy).toHaveBeenCalledWith('- styles/test.scss')
      expect(processSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('processFile', () => {
    it('should process CSS files correctly', async () => {
      const generator = new CssModulesTypesGenerator({ pattern: '**/*.css' })

      // @ts-expect-error - calling private method for testing
      await generator.processFile('styles/test.css')

      expect(fs.readFileSync).toHaveBeenCalledWith('styles/test.css', 'utf8')
      expect(postcss).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should process SCSS files correctly', async () => {
      const generator = new CssModulesTypesGenerator({ pattern: '**/*.scss' })

      // @ts-expect-error - calling private method for testing
      await generator.processFile('styles/test.scss')

      expect(sass.compile).toHaveBeenCalledWith('styles/test.scss')
      expect(postcss).toHaveBeenCalled()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should log debug information when debug is enabled', async () => {
      const generator = new CssModulesTypesGenerator({
        pattern: '**/*.scss',
        debug: true,
      })
      const consoleInfoSpy = vi
        .spyOn(console, 'info')
        .mockImplementation(() => {})

      // @ts-expect-error - calling private method for testing
      await generator.processFile('styles/test.scss')

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Processing file: styles/test.scss',
      )
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Compiling SCSS file: styles/test.scss',
      )
      expect(sass.compile).toHaveBeenCalledWith('styles/test.scss')
    })

    it('should handle errors gracefully', async () => {
      const generator = new CssModulesTypesGenerator({ pattern: '**/*.css' })
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found')
      })

      // @ts-expect-error - calling private method for testing
      await generator.processFile('styles/test.css')

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(
        'Error processing styles/test.css:',
      )
    })

    it('should handle errors gracefully with debug enabled', async () => {
      const generator = new CssModulesTypesGenerator({
        pattern: '**/*.css',
        debug: true,
      })
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      const consoleInfoSpy = vi
        .spyOn(console, 'info')
        .mockImplementation(() => {})

      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found')
      })

      // @ts-expect-error - calling private method for testing
      await generator.processFile('styles/test.css')

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Processing file: styles/test.css',
      )
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Reading CSS file: styles/test.css',
      )
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(
        'Error processing styles/test.css:',
      )
    })
  })

  describe('formatClassName', () => {
    const testFormatting = (
      input: string,
      nameFormat: GeneratorOptions['nameFormat'],
      expected: string,
    ) => {
      const generator = new CssModulesTypesGenerator({
        pattern: '*.css',
        nameFormat,
      })
      // @ts-expect-error - calling private method for testing
      const result = generator.formatClassName(input)
      expect(result).toEqual(expected)
    }

    it('should format class name as camelCase', () => {
      testFormatting('button-primary', 'camelCase', 'buttonPrimary')
      testFormatting('button_primary', 'camelCase', 'buttonPrimary')
      testFormatting('BUTTON_PRIMARY', 'camelCase', 'buttonPrimary')
      testFormatting('Button-Primary', 'camelCase', 'buttonPrimary')
      testFormatting('nav_ITEM', 'camelCase', 'navItem')
      testFormatting('123-invalid', 'camelCase', "'123Invalid'")
      testFormatting('nan__item', 'camelCase', 'nanItem')
      testFormatting('button--state-success', 'camelCase', 'buttonStateSuccess')
    })

    it('should format class name with dashes', () => {
      testFormatting('button-primary', 'dashes', "'button-primary'")
    })

    it('should keep original class name format', () => {
      testFormatting('buttonPrimary', 'original', 'buttonPrimary')
      testFormatting('123-invalid', 'original', "'123-invalid'")
    })
  })

  describe('getOutputPath', () => {
    it('should return original path with .d.ts extension when output is auto', () => {
      const generator = new CssModulesTypesGenerator({
        pattern: '**/*.css',
        output: 'auto',
      })

      // @ts-expect-error - calling private method for testing
      expect(generator.getOutputPath('styles/test.css')).toBe(
        'styles/test.css.d.ts',
      )
    })

    it('should return path in output directory when output is specified', () => {
      const generator = new CssModulesTypesGenerator({
        pattern: '**/*.css',
        output: 'types',
      })

      // @ts-expect-error - calling private method for testing
      expect(generator.getOutputPath('styles/test.css')).toBe(
        'types/styles/test.css.d.ts',
      )
    })
  })

  describe('generateTypeDefinition', () => {
    it('should generate default export type definition', () => {
      const generator = new CssModulesTypesGenerator({
        pattern: '**/*.css',
        exportType: 'default',
      })

      // @ts-expect-error - calling private method for testing
      const result = generator.generateTypeDefinition(
        new Set(['test', 'button-primary']),
      )

      expect(result).toContain('export interface CssModuleClasses {')
      expect(result).toContain('readonly test: string;')
      expect(result).toContain('readonly buttonPrimary: string;')
      expect(result).toContain('export default classes;')
      expect(result).not.toContain('export const test: string;')
    })

    it('should generate named exports type definition', () => {
      const generator = new CssModulesTypesGenerator({
        pattern: '**/*.css',
        exportType: 'named',
      })

      // @ts-expect-error - calling private method for testing
      const result = generator.generateTypeDefinition(
        new Set(['test', 'button-primary']),
      )

      expect(result).not.toContain('export interface CssModuleClasses {')
      expect(result).toContain('export declare const test: string;')
      expect(result).toContain('export declare const buttonPrimary: string;')
    })

    it('should generate both default and named exports type definition', () => {
      const generator = new CssModulesTypesGenerator({
        pattern: '**/*.css',
        exportType: 'both',
      })

      // @ts-expect-error - calling private method for testing
      const result = generator.generateTypeDefinition(
        new Set(['test', 'button-primary']),
      )

      expect(result).toContain('export interface CssModuleClasses {')
      expect(result).toContain('readonly test: string;')
      expect(result).toContain('readonly buttonPrimary: string;')
      expect(result).toContain('export default classes;')
      expect(result).toContain('export const test: string;')
      expect(result).toContain('export const buttonPrimary: string;')
    })

    it('should handle empty class names', () => {
      const generator = new CssModulesTypesGenerator({
        pattern: '**/*.css',
      })

      // @ts-expect-error - calling private method for testing
      const result = generator.generateTypeDefinition(new Set([]))

      expect(result).toContain('readonly [key: string]: string;')
    })
  })
})

describe('generateCssModuleTypes', () => {
  it('should create generator and call generate method', async () => {
    const options: GeneratorOptions = { pattern: '**/*.css' }
    const generateMock = vi.fn()

    vi.spyOn(CssModulesTypesGenerator.prototype, 'generate').mockImplementation(
      generateMock,
    )

    await generateCssModuleTypes(options)

    expect(generateMock).toHaveBeenCalledTimes(1)
  })
})

describe('processSingleFile', () => {
  it('should process a single file with correct options', async () => {
    // Mock generate method for testing
    const originalGenerate = CssModulesTypesGenerator.prototype.generate
    CssModulesTypesGenerator.prototype.generate = vi
      .fn()
      .mockResolvedValue(undefined)

    // Mock console.info
    const consoleInfoSpy = vi
      .spyOn(console, 'info')
      .mockImplementation(() => {})

    try {
      // Call processSingleFile with options
      await processSingleFile('styles/file.scss', {
        output: 'types',
        exportType: 'both',
        nameFormat: 'original',
        debug: true,
      })

      // Check if the function correctly logs the debug message
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'Processing single file: styles/file.scss',
      )

      // Verify the generate method was called
      expect(CssModulesTypesGenerator.prototype.generate).toHaveBeenCalled()
    } finally {
      // Restore the original method
      CssModulesTypesGenerator.prototype.generate = originalGenerate
    }
  })
})
