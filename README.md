# Azure Developer CLI Template Helper MCP Server

An MCP server that helps developers create and validate Azure Developer CLI (azd) templates by providing tools for template analysis, validation, and best practices checking.

## Prerequisites

- Node.js 16 or higher
- Azure Developer CLI (azd) installed
- VS Code with MCP support (e.g., Claude for Desktop)

## Installation

```bash
npm install
```

## Usage

The server provides three main tools that work with your current workspace by default:

### 1. List Templates
Lists all available Azure Developer CLI templates.

Example usage in Claude:
```
Show me the available azd templates
```

### 2. Analyze Template
Analyzes an azd template directory and provides insights about its structure and components.
If no path is specified, analyzes the current workspace.

Examples:
```
Analyze this template              # Analyzes current workspace
Analyze the template in /path/to/template  # Analyzes specific path
```

### 3. Validate Template
Validates an azd template directory for compliance with best practices.
If no path is specified, validates the current workspace.

Examples:
```
Check if this template follows best practices  # Validates current workspace
Check if my template in /path/to/template follows best practices  # Validates specific path
```

### 4. Create Template
Creates a new Azure Developer CLI template with best practices.
If no output path is specified, creates the template in the current workspace.

Examples:
```
Create a starter template for azd with:
- name: my-web-app
- language: typescript
- architecture: web

Create a starter template for azd in /custom/path with:
- name: my-api
- language: python
- architecture: api
```

## Validation Checks

The template validator performs the following checks:

### Required Files
- README.md with required sections
- LICENSE
- SECURITY.md
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- azure.yaml or azure-dev.yaml
- .devcontainer configuration
- GitHub workflow files

### Documentation Requirements
- Architecture diagram
- Region availability information
- Cost estimation guidance
- Security notices
- Required README sections:
  - Features
  - Getting Started
  - Prerequisites
  - Installation
  - Architecture Diagram
  - Region Availability
  - Costs
  - Security
  - Resources

### Development Environment
- Dev container configuration
- GitHub Codespaces support
- Required dev container features:
  - Azure CLI
  - GitHub CLI
  - Docker support

### Infrastructure Validation
- Provider configuration (Bicep/Terraform)
- Required workflow definitions
- Infrastructure as Code best practices
- Resource configuration validation

### Security Checks
- Security notice presence
- Security scanning workflow
- Required security documentation
- Best practice compliance

## Development

- `npm run build` - Build the project
- `npm run dev` - Run TypeScript in watch mode
- `npm run watch` - Run both TypeScript compilation and server in watch mode
- `npm start` - Start the MCP server

## IDE Configuration

### VS Code / VS Code Insiders
Add the following to your VS Code settings.json (`settings.json`):

```json
{
    "mcp.servers": {
        "azd-template-helper": {
            "command": "node",
            "args": [
                "/path/to/mcp-azd-template/dist/index.js"
            ]
        }
    }
}
```

For VS Code Insiders, you can use the same configuration. The MCP server will work in both VS Code Stable and Insiders editions.

#### Installation Steps for VS Code
1. Open VS Code Settings (Ctrl+,)
2. Search for "MCP: Servers"
3. Click "Edit in settings.json"
4. Add the configuration above
5. Replace `/path/to/mcp-azd-template` with your actual path
6. Restart VS Code

The MCP server will now be available in both VS Code and VS Code Insiders through GitHub Copilot Chat.

### Claude for Desktop Configuration

Add the following to your Claude for Desktop configuration file (`claude_desktop_config.json`):

```json
{
    "mcpServers": {
        "azd-template-helper": {
            "command": "node",
            "args": [
                "/path/to/mcp-azd-template/dist/index.js"
            ]
        }
    }
}
```

## Features

- Template listing and discovery
- Comprehensive structure analysis
- Schema validation for azure.yaml
- Infrastructure and application code validation
- Security requirements checking
- Development environment validation
- GitHub workflow verification
- Detailed validation reporting
- Best practice recommendations
- Documentation completeness checking

## Validation Output

The validation results are presented in a clear, structured format:

```
# Template Validation Report
## Critical Issues (if any)
## Documentation Check
## Infrastructure Check
## Security Check
## Development Environment
## GitHub Workflows
## Additional Recommendations
## Overall Status
```

Each section provides:
- ✅ Success indicators
- ❌ Critical issues
- ⚠ Warnings
- 💡 Recommendations

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.