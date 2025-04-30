# Maintaining Your Workspace

This document provides guidance on how to keep your workspace clean and maintain the codebase effectively.

## Cleanup Procedures

This project includes several cleanup procedures to help you maintain a clean workspace:

### Standard Cleanup Commands

| Command | Description |
|---------|-------------|
| `npm run cleanup-temp` | Cleans temporary files created during mermaid diagram generation |
| `npm run cleanup-all` | Comprehensive cleanup that removes all temporary files, test artifacts, and generated content |
| `npm run cleanup` | Alias for cleanup-all |

### What Gets Cleaned

The cleanup scripts handle:

1. **Temporary Files**
   - `.temp` directories with mermaid generation artifacts
   - Test output text files (test-output.txt, function-test-output.txt, etc.)
   - Generated diagram PNG files with timestamps

2. **Test Artifacts**
   - Coverage reports in the `coverage` directory
   - Generated files in `test-output` directory
   - Temporary test diagrams

3. **System Artifacts**
   - `.DS_Store` files (macOS)
   - `Thumbs.db` files (Windows)
   - Node module caches

### When to Run Cleanup

- **Before committing code**: Run `npm run cleanup` to ensure no unnecessary files are committed
- **After running tests**: Run `npm run cleanup-temp` to remove temporary files
- **When switching branches**: Run `npm run cleanup-all` to ensure a clean workspace

### Automatic Cleanup

The `pretest:coverage` script automatically runs `cleanup-temp` before running coverage tests.

## Git Practices

The `.gitignore` file is configured to exclude generated files, but it's still good practice to run
the cleanup scripts before committing changes.

## Adding New Test Files

When adding new test files that generate artifacts:

1. Update `scripts/cleanup-all.js` to include the new artifact locations
2. Consider updating `.gitignore` to exclude the new artifacts
