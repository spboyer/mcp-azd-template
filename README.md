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

## Example Prompts

When using this MCP server with AI assistants like GitHub Copilot, you can use the following example prompts:

### Template Search

```
Search for Java Spring Boot templates in the Azure AI gallery
```

```
Find Next.js starter templates from both the AI gallery and azd CLI
```

```
Look for container-based microservices templates with Go support
```

```
Search for Azure Functions templates with Python and OpenAI integration
```

```
Find templates that use Azure Container Apps and Kubernetes
```

```
Search for templates with CI/CD pipeline examples
```

### Template Analysis

```
Can you analyze my current Azure Developer CLI template and provide feedback?
```

```
Review this azd template in my current directory and tell me what needs improvement.
```

### Template Validation

```
Validate this azd template against best practices.
```

```
Check if my azd template follows Microsoft's recommended structure and security practices.
```

### Template Creation

```
Create a new Azure Function app template using TypeScript.
```

```
I need a starter template for a containerized web app using Python. Can you create one?
```

```
Help me scaffold an azd template for a .NET API with all the required files.
```

### Template Listing

```
Show me available azd templates I can use as references.
```

```
What are the official Azure Developer CLI templates available?
```

### Troubleshooting

```
My azd template is missing documentation. What specific sections should I add?
```

```
How do I fix the security warnings in my template's validation report?
```

## Features

The package provides the following tools:

### 1. Search Templates

Search Azure Developer CLI (azd) templates and Azure AI gallery:
- Search local azd CLI templates
- Search Azure AI gallery templates
- Filter by language, architecture, or keywords
- Get detailed template information

### 2. List Templates

Lists all available Azure Developer CLI (azd) templates.

### 3. Analyze Template

Analyzes an Azure Developer CLI (azd) template directory and provides insights:
- Structure validation
- Configuration analysis
- Best practice recommendations

### 4. Validate Template

Performs a comprehensive validation of an azd template with detailed checks for:
- Documentation completeness
- Infrastructure configuration
- Security settings
- Development environment setup
- GitHub workflow configuration

### 5. Create Template

Creates a new Azure Developer CLI template with best practices built-in:
- Supports multiple languages (TypeScript, Python, Java, .NET)
- Various architectures (web, API, function app, container)
- Includes necessary configuration files

## Requirements

- Node.js 18+
- Azure Developer CLI (azd) installed

## License

MIT