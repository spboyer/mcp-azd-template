# MCP AZD Template [![npm version](https://img.shields.io/npm/v/mcp-azd-template.svg?style=flat)](https://www.npmjs.com/package/mcp-azd-template)

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-Install_MCP_AZD_Template-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=MCP%20AZD%20Template&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-azd-template%40latest%22%5D%7D) [![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_MCP_AZD_Template-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=MCP%20AZD%20Template&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-azd-template%40latest%22%5D%7D&quality=insiders)


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

## GitHub Actions Integration

You can integrate MCP AZD Template with GitHub Actions to automatically validate your Azure Developer CLI (azd) templates on pull requests or commits. This helps ensure your templates always comply with best practices before they're merged.

### Setting up the GitHub Action

1. Create a `.github/workflows` directory in your repository if it doesn't already exist
2. Add a new file named `validate-template.yml` with the following content:

```yaml
name: Validate Azure Developer CLI Template

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Azure Developer CLI
        run: |
          curl -fsSL https://aka.ms/install-azd.sh | bash

      - name: Install mcp-azd-template
        run: npm install -g mcp-azd-template

      - name: Validate AZD Template
        run: mcp-azd-template validate-action "${{ github.workspace }}"
```

### Advanced Configuration

#### Creating Detailed Issues Automatically

The workflow includes automatic creation of GitHub issues with detailed validation results when validation fails. The created issue will contain:

- Critical issues found in the template
- Warnings and recommendations for improvement
- The full validation output in a collapsible section
- Links to the specific commit and workflow run

This feature makes it easy for teams to track and address template issues without needing to dig through workflow logs:

```yaml
# This step captures the validation output
- name: Run Validation and Capture Output
  id: validate
  run: |
    # Run validation and capture output to a file
    mcp-azd-template validate-action "${{ github.workspace }}" > validation_output.txt 2>&1
    
    # Check if the validation failed and create a summary file for the issue
    if [ $? -ne 0 ]; then
      echo "::set-output name=status::failed"
      cat validation_output.txt
    else
      echo "::set-output name=status::success"
    fi
  continue-on-error: true

# This step creates the detailed issue with validation results
- name: Create Issue with Validation Results
  if: ${{ steps.validate.outputs.status == 'failed' && github.event_name == 'push' }}
  uses: actions/github-script@v6
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      const fs = require('fs');
      
      // Read validation output file
      let validationOutput = fs.readFileSync('validation_output.txt', 'utf8');
      
      // Extract critical issues and warnings sections
      const criticalIssuesMatch = validationOutput.match(/### ❌ Critical Issues\n([\s\S]*?)(?=\n###|$)/);
      const warningsMatch = validationOutput.match(/### ⚠️ Warnings and Recommendations\n([\s\S]*?)(?=\n###|$)/);
      
      // Format the issue body with validation results
      await github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: 'AZD Template Validation Failed',
        body: `# Template Validation Failed\n\nDetails of issues found in commit ${context.sha.substring(0, 7)}...`
      });
```

### CLI Usage for CI/CD

You can also run template validation directly in any CI/CD environment:

```bash
# Install globally
npm install -g mcp-azd-template

# Run validation (exits with code 1 if validation fails)
mcp-azd-template validate-action /path/to/template
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