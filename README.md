# CSS Modules Types Generator

[![npm version](https://img.shields.io/npm/v/css-modules-types-generator.svg)](https://www.npmjs.com/package/css-modules-types-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A CLI tool and library for generating TypeScript definitions for CSS/SCSS modules.

## Features

- 🎯 Generates TypeScript definitions for CSS/SCSS modules
- 📦 Supports both CSS and SCSS/Sass files
- 🔄 Watch mode for automatic regeneration on file changes
- 🎨 Configurable export types (default, named, or both)
- 📝 Customizable class name formatting
- 🔍 Debug mode for troubleshooting
- ⚡ Fast and lightweight

## Installation

```bash
npm install -g css-modules-types-generator
```

Or as a dev dependency:

```bash
npm install --save-dev css-modules-types-generator
```

## Usage

### CLI

```bash
# Generate types for all CSS modules
css-types-gen "src/**/*.module.{css,scss}"

# With custom output directory
css-types-gen "src/**/*.module.{css,scss}" -o types

# Watch mode
css-types-gen "src/**/*.module.{css,scss}" --watch

# Different export types
css-types-gen "src/**/*.module.{css,scss}" --export-type named
css-types-gen "src/**/*.module.{css,scss}" --export-type both

# Custom name formatting
css-types-gen "src/**/*.module.{css,scss}" --name-format dashes

# Debug mode for troubleshooting
css-types-gen "src/**/*.module.{css,scss}" --debug
```

### Programmatic API

```typescript
import { generateCssModuleTypes, processSingleFile } from 'css-modules-types-generator';

// Basic usage
await generateCssModuleTypes({
  pattern: 'src/**/*.module.{css,scss}'
});

// With all options
await generateCssModuleTypes({
  pattern: 'src/**/*.module.{css,scss}',
  output: 'types', // optional, default: 'auto' (alongside source files)
  watch: false, // optional, default: false
  exportType: 'default', // optional, 'default' | 'named' | 'both'
  nameFormat: 'camelCase', // optional, 'camelCase' | 'dashes' | 'original'
  debug: false // optional, enables verbose logging
});

// Process a single file directly (useful for integrations)
await processSingleFile('src/components/Button.module.scss', {
  output: 'types',
  exportType: 'both',
  nameFormat: 'original',
  debug: true
});
```

## Options

- `pattern`: Glob pattern to match CSS/SCSS files
- `output`: Output directory (default: 'auto' - alongside source files)
- `watch`: Watch for file changes (default: false)
- `exportType`: Export type - `default`, `named`, or `both` (default: `default`)
- `nameFormat`: Class name format - `camelCase`, `dashes`, or `original` (default: `camelCase`)
- `debug`: Enable debug mode with verbose logging (default: false)

### CLI Options

- `--output, -o`: Output directory
- `--watch, -w`: Watch for file changes
- `--export-type, -e`: Export type
- `--name-format, -n`: Class name format
- `--debug, -d`: Enable debug mode

## Export Types

### Default (default)

```typescript
export interface CssModuleClasses {
  readonly container: string;
  readonly button: string;
}

export type ClassNames = keyof CssModuleClasses;

declare const classes: CssModuleClasses;
export default classes;
```

### Named

```typescript
export declare const container: string;
export declare const button: string;
```

### Both

```typescript
export interface CssModuleClasses {
  readonly container: string;
  readonly button: string;
}

export type ClassNames = keyof CssModuleClasses;

declare const classes: CssModuleClasses;
export default classes;

export const container: string;
export const button: string;
```

## Example

Given a CSS module file `Button.module.scss`:

```scss
.container {
  display: flex;
  align-items: center;
}

.button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;

  &--primary {
    background-color: blue;
    color: white;
  }

  &--secondary {
    background-color: gray;
    color: black;
  }
}
```

The generator will create `Button.module.scss.d.ts` with the following content (using default export type and camelCase format):

```typescript
export interface CssModuleClasses {
  readonly container: string;
  readonly button: string;
  readonly buttonPrimary: string;
  readonly buttonSecondary: string;
}

export type ClassNames = keyof CssModuleClasses;

declare const classes: CssModuleClasses;
export default classes;
```

## Integration with TypeScript

In your TypeScript files, you can now import and use the CSS modules with full type support:

```typescript
import styles from './Button.module.scss';

// TypeScript will provide autocomplete and type checking
const button = <button className={styles.button}>Click me</button>;
```

## Integration with Build Systems

### Webpack

When using with Webpack, ensure you have `css-loader` configured with CSS modules enabled:

```javascript
// webpack.config.js
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.module\.(css|scss)$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
            },
          },
          'sass-loader',
        ],
      },
    ],
  },
};
```

### Vite

For Vite, CSS modules are supported out of the box for files ending with `.module.css`:

```javascript
// vite.config.js
export default {
  css: {
    modules: {
      // Optional customization
      localsConvention: 'camelCase',
    },
  },
};
```

## npm Scripts Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "css-types": "css-types-gen 'src/**/*.module.{css,scss}'",
    "css-types:watch": "css-types-gen 'src/**/*.module.{css,scss}' --watch",
    "css-types:debug": "css-types-gen 'src/**/*.module.{css,scss}' --watch --debug",
    "prebuild": "npm run css-types"
  }
}
```

## Compatibility

This tool works with all major bundlers and build systems:

- Webpack with css-loader
- Vite
- Next.js
- Create React App
- Rollup
- esbuild

## Requirements

- Node.js 16.x or higher
- npm 7.x or higher or equivalent package manager

## Troubleshooting

### No types are generated

- Ensure your CSS files follow the naming pattern specified in your glob (e.g., `*.module.css`)
- Check if the CSS file contains valid CSS class definitions
- Verify you have read/write permissions for the target directories
- Run with the `--debug` flag to see detailed logs: `css-types-gen "src/**/*.module.{css,scss}" --debug`

### Watch mode not detecting changes

- The watch mode has been improved to reliably detect file changes
- Use the `--debug` flag to see which directories and files are being watched
- Ensure your file glob pattern is correct and matches your CSS/SCSS files
- Check that the changed files are CSS/SCSS files and not generated `.d.ts` files

### Types are generated but missing some classes

- For SCSS nested selectors, ensure the CSS is valid
- Complex selectors might not be properly extracted; try simplifying your CSS
- Check the console output for any parsing errors
- Run with `--debug` to see more information about the extraction process

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](./LICENSE) License © 2025 [Theoklitos Bampouris](https://github.com/theoklitosBam7)
