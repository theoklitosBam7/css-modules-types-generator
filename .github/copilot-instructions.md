# AI Coding Agent Instructions: CSS Modules Types Generator

## Project Purpose & Structure

- **Goal:** Generate TypeScript typings (`.d.ts`) for CSS/SCSS modules, supporting default/named/both export styles and customizable class name formatting.
- **Key files:**
  - `src/cli.ts`: CLI entry and argument parsing (uses `commander`, `chokidar`)
  - `src/index.ts`: Core logic for type generation (handles globbing, PostCSS, SCSS, formatting, output)
  - `src/run.ts`: Node entrypoint for CLI
  - `tests/index.test.ts`: Vitest-based test suite (mocks FS, glob, PostCSS, Sass)
  - `tsdown.config.ts`, `tsconfig.json`: Build and type config
  - `README.md`: Full usage, API, and integration docs

## Architecture & Patterns

- **Separation of concerns:** CLI logic (`cli.ts`) is kept separate from core generation logic (`index.ts`).
- **Type generation:**
  - Supports export types: `default`, `named`, or `both` (see README for code output examples)
  - Class name formatting: `camelCase`, `dashes`, or `original` (option via CLI/API)
  - Batch processing via glob patterns (e.g., `src/**/*.module.{css,scss}`)
- **Output:** Typings are generated alongside source files by default, or to a custom directory with `--output`.
- **SCSS/BEM:** Handles nested selectors and BEM modifiers (see README for mapping example).

## Developer Workflows

- **Build:**
  - Use `tsdown` (see `tsdown.config.ts`) for building: `npm run build`
  - Type checking: `npm run typecheck`
- **Test:**
  - Run all tests: `npm test` or `npx vitest`
  - Test files: `tests/index.test.ts` (uses Vitest, mocks FS/glob/PostCSS/Sass)
- **Type Generation:**
  - CLI: `css-types-gen "src/**/*.module.{css,scss}"`
  - Watch mode: `css-types-gen "src/**/*.module.{css,scss}" --watch`
  - Programmatic: `generateCssModuleTypes` from main export
- **Scripts:**
  - See `package.json` for `css-types`, `css-types:watch`, `prebuild`, `build`, `test`, etc.

## Conventions & Integration

- **Naming:** Only files matching the glob (e.g., `*.module.css`) are processed.
- **Integration:**
  - Works with Webpack, Vite, Next.js, CRA, Rollup, esbuild (see README for config snippets)
- **Node version:** Requires Node.js 16+ and npm 7+
- **Lint/Format:** Uses ESLint (`@sxzz/eslint-config`) and Prettier (`@sxzz/prettier-config`).

## Examples

- See `README.md` for sample CSS/SCSS and generated typings for each export type.
- Example CLI usage:
  ```bash
  css-types-gen "src/**/*.module.{css,scss}" --export-type both --name-format dashes
  ```

## Troubleshooting

- If types are missing/incomplete, check file naming, class selector validity, and console output for errors.
- For SCSS, ensure valid syntax and simple selectors for best results.

---

If any section is unclear or incomplete, please provide feedback to improve these instructions.
