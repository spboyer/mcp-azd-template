# MCP AZD Template

An MCP server that provides tools for working with Azure Developer CLI (azd) templates. This package helps with template validation, analysis, and creation while following best practices.

## Installation

### Global Installation

To use as a command-line tool:

```bash
npm install -g mcp-azd-template
```

### Local Installation

For use in your project:

```bash
npm install mcp-azd-template
```

## Usage

### As a CLI Tool

After global installation, you can start the MCP server by running:

```bash
mcp-azd-template
```

This runs the server in stdio mode, which integrates with VS Code MCP extensions.

### As an MCP Server in VS Code

Add to your VS Code settings.json:

```json
"mcp": {
  "servers": {
    "azd-template-helper": {
      "command": "mcp-azd-template"
    }
  }
}
```

### Using with npx (No Installation Required)

You can use the package directly with npx without installing it:

```json
"mcp": {
  "servers": {
    "azd-template-helper": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-azd-template@latest"
      ]
    }
  }
}
```

### Programmatic Usage

You can use the API programmatically in your JavaScript/TypeScript applications:

```typescript
import { createServer, listTemplates, analyzeTemplate, validateTemplate } from 'mcp-azd-template';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Use individual functions directly
const templates = await listTemplates();
console.log(templates);

// Or create and use the MCP server
const server = createServer();
// Connect to your preferred transport...

// Or register tools on your existing MCP server
import { registerTools } from 'mcp-azd-template';
const myServer = new McpServer({ /* your config */ });
registerTools(myServer);
```

## Features

The package provides the following tools:

### 1. List Templates

Lists all available Azure Developer CLI (azd) templates.

### 2. Analyze Template

Analyzes an Azure Developer CLI (azd) template directory and provides insights:
- Structure validation
- Configuration analysis
- Best practice recommendations

### 3. Validate Template

Performs a comprehensive validation of an azd template with detailed checks for:
- Documentation completeness
- Infrastructure configuration
- Security settings
- Development environment setup
- GitHub workflow configuration

### 4. Create Template

Creates a new Azure Developer CLI template with best practices built-in:
- Supports multiple languages (TypeScript, Python, Java, .NET)
- Various architectures (web, API, function app, container)
- Includes necessary configuration files

## Requirements

- Node.js 18+
- Azure Developer CLI (azd) installed

## License

MIT