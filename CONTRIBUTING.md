# Contributing to Azure Developer CLI Template Helper MCP Server

Thank you for your interest in contributing to our project! We welcome contributions from everyone.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Issues

- Before submitting an issue, please search existing issues to avoid duplicates
- Use the issue template when creating a new issue
- Include as much detail as possible, including steps to reproduce if reporting a bug

### Development Process

1. Fork the repository
2. Create a new branch for your feature/fix
3. Install dependencies with `npm install`
4. Make your changes
5. Run tests and ensure all validations pass
6. Submit a pull request

### Pull Request Process

1. Update the README.md with details of any changes to the interface
2. Follow the existing code style and conventions
3. Include appropriate tests for your changes
4. Update documentation as needed
5. Your PR must pass all CI checks before it can be merged

### Code Style

- Use TypeScript features appropriately
- Follow async/await patterns for asynchronous operations
- Include proper error handling
- Add appropriate comments and documentation
- Use Zod schemas for validation
- Follow the MCP server implementation best practices

### Testing

- Add tests for new features
- Ensure existing tests pass
- Test your changes with real azd templates

## Development Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Build the project:
```bash
npm run build
```
4. Run in development mode:
```bash
npm run dev
```

## Project Structure

- `src/` - Source code
  - `index.ts` - Main MCP server implementation
  - `azd-tools.ts` - Azure Developer CLI integration and tools

## Documentation

- Keep the README.md up to date
- Document new features and changes
- Include examples where appropriate
- Update validation rules documentation

## Questions?

If you have questions, please open a discussion in the GitHub repository.