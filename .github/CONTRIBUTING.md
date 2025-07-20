# Contributing to CSS Modules Types Generator

Thank you for your interest in contributing to CSS Modules Types Generator! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 10.x or higher

### Setting Up Development Environment

1. Fork the repository on GitHub
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/css-modules-types-generator.git
   cd css-modules-types-generator
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Set up git hooks:

   ```bash
   npm run prepare-hooks
   ```

## Development Workflow

### Building the Project

```bash
npm run build       # Build the project
npm run dev         # Build in watch mode for development
```

### Testing

```bash
npm test              # Run all tests
npm run unit:watch    # Run tests in watch mode
npm run unit:coverage # Run tests with coverage report
```

### Linting and Formatting

```bash
npm run typecheck   # Check TypeScript types
npm run lint        # Run ESLint
npm run lint:fix    # Run ESLint with auto-fix
npm run format      # Format code with Prettier
```

### Git Hooks

This project uses [simple-git-hooks](https://github.com/toplenboren/simple-git-hooks) to run checks:

- **pre-commit**: Runs linting and formatting on staged files
- **pre-push**: Runs type checking and tests

You can bypass hooks if needed:

```bash
SKIP_SIMPLE_GIT_HOOKS=1 git commit -m "..."
```

## Project Structure

```text
css-modules-types-generator/
├── src/
│   ├── cli.ts         # CLI entry point and argument parsing
│   ├── index.ts       # Core type generation logic
│   └── run.ts         # Node entry point for CLI
├── tests/
│   └── index.test.ts  # Test suite
├── tsdown.config.ts   # Build configuration
├── tsconfig.json      # TypeScript configuration
└── package.json       # Dependencies and scripts
```

### Coding Style

- Follow the ESLint and Prettier configurations
- Use TypeScript for type safety
- Write meaningful commit messages (conventional commits style recommended)
- Include tests for new features

## Pull Request Process

1. Ensure your code passes all tests and lint checks
2. Update documentation if necessary
3. Make sure your PR description clearly describes the changes
4. Reference any related issues in your PR description

## Release Process

Maintainers will handle the release process using:

```bash
npm run release
```

This will:

1. Run tests and type checking
2. Bump version based on conventional commits
3. Build the package
4. Publish to npm

## Questions?

If you have any questions, feel free to open an issue or reach out to the maintainer.
