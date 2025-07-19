import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { watch } from 'chokidar'
import { Command } from 'commander'
import { glob } from 'glob'
import { generateCssModuleTypes, processSingleFile } from './index'

/**
 * Helper function to log watched directories
 * @param watchedPaths Object containing directories and their files being watched
 * @param verbose Whether to log detailed information about watched files
 */
function logWatchedDirectories(
  watchedPaths: Record<string, string[]>,
  verbose = false,
) {
  for (const dir of Object.keys(watchedPaths)) {
    const files = watchedPaths[dir]
    console.info(`- Directory: ${dir} (${files.length} files)`)
    if (verbose && files.length > 0) {
      for (const file of files) {
        console.info(`  - ${file}`)
      }
    }
  }
}

/**
 * Extract directory paths to watch based on glob results
 */
async function getDirectoriesToWatch(
  pattern: string,
  includeFilter = '',
  debug = false,
): Promise<string[]> {
  const initialFiles = await glob(pattern)
  if (debug) {
    console.info(`Found ${initialFiles.length} files in initial glob matching`)
  }

  const watchDirs = new Set<string>()
  for (const file of initialFiles) {
    const dirPath = path.dirname(file)
    watchDirs.add(dirPath)

    // Also add parent directories for deeper watching
    let parent = dirPath
    while (parent !== '.' && parent !== '/') {
      parent = path.dirname(parent)
      if (!includeFilter || parent.includes(includeFilter)) {
        // Only add relevant parent dirs if filter provided
        watchDirs.add(parent)
      }
    }
  }

  return Array.from(watchDirs)
}

const program = new Command()

program
  .name('css-types-gen')
  .description('Generate TypeScript definitions for CSS/SCSS modules')
  .version('1.0.0')

program
  .argument('<pattern>', 'Glob pattern to match CSS/SCSS files')
  .option(
    '-o, --output <dir>',
    'Output directory (default: auto - alongside source files)',
  )
  .option('-w, --watch', 'Watch for file changes')
  .option(
    '-e, --export-type <type>',
    'Export type: default, named, or both',
    'default',
  )
  .option(
    '-n, --name-format <format>',
    'Class name format: camelCase, dashes, or original',
    'camelCase',
  )
  .option('-d, --debug', 'Enable debug mode with verbose logging')
  .action(async (pattern, options) => {
    const generatorOptions = {
      pattern,
      output: options.output,
      watch: options.watch,
      exportType: options.exportType,
      nameFormat: options.nameFormat,
      debug: options.debug,
    }

    if (options.watch) {
      console.log(`Watching ${pattern} for changes...`)

      console.info(`Current working directory: ${process.cwd()}`)
      console.info(`Watch pattern: ${pattern}`)

      // First do an initial generation to create all type files
      await generateCssModuleTypes(generatorOptions)

      const projectDir = pattern.split('/')[1] || ''
      const dirsToWatch = await getDirectoriesToWatch(
        pattern,
        projectDir,
        options.debug,
      )

      if (options.debug) {
        console.info(
          `Will watch ${dirsToWatch.length} directories based on found files:`,
        )
        for (const dir of dirsToWatch) {
          console.info(`- ${dir}`)
        }
      }

      const watcher = watch(dirsToWatch, {
        ignored: [/node_modules/, /dist/, /build/, /output/, /out/, /\.d\.ts$/],
        persistent: true,
        ignoreInitial: true,
        usePolling: true,
        interval: 100, // Check for changes every 100ms
        binaryInterval: 300, // Throttle binary file churn
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
        alwaysStat: true,
        followSymlinks: true,
      })

      watcher.on('ready', () => {
        console.info('Watcher is ready and actively monitoring for changes')
        if (!options.debug) return

        console.info(`Using pattern for watching: ${pattern}`)

        const watchedPaths = watcher.getWatched()
        const dirCount = Object.keys(watchedPaths).length

        console.info(`Debug mode enabled - watching ${dirCount} directories:`)

        if (dirCount === 0) {
          console.warn(
            'WARNING: No paths are being watched! File changes will not be detected.',
          )
          console.info(
            'Try using an absolute path pattern or checking file permissions.',
          )
          return
        }

        logWatchedDirectories(watchedPaths, options.debug)
      })

      const moduleCssFilePattern = /\.module\.(?:css|scss|sass)$/i

      watcher.on('change', async (filePath) => {
        if (!moduleCssFilePattern.test(filePath)) {
          if (options.debug) {
            console.info(`Ignoring non-module CSS/SCSS file: ${filePath}`)
          }
          return
        }

        if (options.debug) {
          console.info(`Raw change event path: ${filePath}`)
          console.info(`File exists check: ${fs.existsSync(filePath)}`)
        }

        const absoluteFilePath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(process.cwd(), filePath)

        if (options.debug) {
          console.info(`Resolved absolute path: ${absoluteFilePath}`)
          console.info(
            `Absolute path exists check: ${fs.existsSync(absoluteFilePath)}`,
          )
        }

        console.log(`File ${absoluteFilePath} changed, regenerating types...`)

        const { pattern, ...otherOptions } = generatorOptions

        await processSingleFile(absoluteFilePath, otherOptions)
      })

      watcher.on('add', async (filePath) => {
        if (!moduleCssFilePattern.test(filePath)) {
          if (options.debug) {
            console.info(`Ignoring non-module CSS/SCSS file: ${filePath}`)
          }
          return
        }

        if (options.debug) {
          console.info(`Raw add event path: ${filePath}`)
          console.info(`File exists check: ${fs.existsSync(filePath)}`)
        }

        const absoluteFilePath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(process.cwd(), filePath)

        if (options.debug) {
          console.info(`Resolved absolute path: ${absoluteFilePath}`)
          console.info(
            `Absolute path exists check: ${fs.existsSync(absoluteFilePath)}`,
          )
        }

        console.log(`File ${absoluteFilePath} added, generating types...`)

        const { pattern, ...otherOptions } = generatorOptions

        await processSingleFile(absoluteFilePath, otherOptions)
      })

      watcher.on('unlink', (filePath) => {
        if (!moduleCssFilePattern.test(filePath)) {
          if (options.debug) {
            console.info(
              `Ignoring non-module CSS/SCSS file deletion: ${filePath}`,
            )
          }
          return
        }

        const absoluteFilePath = path.isAbsolute(filePath)
          ? filePath
          : path.resolve(process.cwd(), filePath)

        const typesFilePath =
          options.output === 'auto'
            ? `${absoluteFilePath}.d.ts`
            : path.join(
                options.output,
                `${path.relative(process.cwd(), absoluteFilePath)}.d.ts`,
              )

        if (fs.existsSync(typesFilePath)) {
          fs.unlinkSync(typesFilePath)
          console.log(
            `File ${absoluteFilePath} removed, deleted types file: ${typesFilePath}`,
          )
        }
      })

      watcher.on('error', (error) => {
        console.error(`Watcher error: ${error}`)
      })
    } else {
      // Once-off generation
      await generateCssModuleTypes(generatorOptions)
    }
  })

export function runCli() {
  program.parse()
}
