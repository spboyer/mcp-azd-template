"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = exports.createTemplate = exports.validateTemplate = exports.analyzeTemplate = exports.listTemplates = void 0;
exports.formatValidationSection = formatValidationSection;
exports.registerTools = registerTools;
exports.main = main;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const azd_tools_js_1 = require("./azd-tools.js");
const zod_1 = require("zod");
// Export the tool functions for programmatic usage
var azd_tools_js_2 = require("./azd-tools.js");
Object.defineProperty(exports, "listTemplates", { enumerable: true, get: function () { return azd_tools_js_2.listTemplates; } });
Object.defineProperty(exports, "analyzeTemplate", { enumerable: true, get: function () { return azd_tools_js_2.analyzeTemplate; } });
Object.defineProperty(exports, "validateTemplate", { enumerable: true, get: function () { return azd_tools_js_2.validateTemplate; } });
Object.defineProperty(exports, "createTemplate", { enumerable: true, get: function () { return azd_tools_js_2.createTemplate; } });
// Create MCP server instance
const createServer = () => {
    const server = new mcp_js_1.McpServer({
        name: "azd-template-helper",
        version: "1.2.0",
        capabilities: {
            resources: {},
            tools: {},
        },
    });
    // Register all tools on the server
    registerTools(server);
    return server;
};
exports.createServer = createServer;
// Helper function to format validation results
function formatValidationSection(title, items, icon = '•') {
    if (items.length === 0)
        return '';
    return `\n### ${title}\n${items.map(item => `${icon} ${item}`).join('\n')}`;
}
// Register tools on an MCP server instance
function registerTools(server) {
    server.tool("list-templates", "List all available Azure Developer CLI (azd) templates", {}, async () => {
        const result = await (0, azd_tools_js_1.listTemplates)();
        return {
            content: [
                {
                    type: "text",
                    text: result.error ?? result.templates
                }
            ]
        };
    });
    server.tool("analyze-template", "Analyze an Azure Developer CLI (azd) template directory and provide insights", {
        templatePath: zod_1.z.string().describe('Path to the azd template directory').optional()
    }, async ({ templatePath }) => {
        const result = await (0, azd_tools_js_1.analyzeTemplate)(templatePath);
        if ('error' in result) {
            return {
                content: [
                    {
                        type: "text",
                        text: result.error
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `# Template Analysis Results

## Structure Check
• Infrastructure: ${result.hasInfra ? '✓ Present' : '⚠ Missing'}
• Application Code: ${result.hasApp ? '✓ Present' : '⚠ Missing'}

## Azure Configuration
\`\`\`yaml
${result.configFile}
\`\`\`

${result.recommendations.length > 0
                        ? `## Recommendations\n${result.recommendations.map(r => `• ${r}`).join('\n')}`
                        : '## Status\n✓ Template structure looks good!'}`
                }
            ]
        };
    });
    server.tool("validate-template", "Validate an Azure Developer CLI (azd) template directory for compliance with best practices", {
        templatePath: zod_1.z.string().describe('Path to the azd template directory').optional()
    }, async ({ templatePath }) => {
        const result = await (0, azd_tools_js_1.validateTemplate)(templatePath);
        if ('error' in result) {
            return {
                content: [
                    {
                        type: "text",
                        text: result.error
                    }
                ]
            };
        }
        const sections = ['# Template Validation Report'];
        // Critical Issues (Errors)
        if (result.errors.length > 0) {
            sections.push(formatValidationSection('Critical Issues', result.errors, '❌'));
        }
        // Documentation Check
        const docStatus = result.readmeIssues.length === 0
            ? ['✓ Documentation meets all requirements']
            : result.readmeIssues;
        sections.push(formatValidationSection('Documentation Check', docStatus, result.readmeIssues.length === 0 ? '✓' : '⚠'));
        // Infrastructure Check
        const infraStatus = result.infraChecks.length === 0
            ? ['✓ Infrastructure configuration is valid']
            : result.infraChecks;
        sections.push(formatValidationSection('Infrastructure Check', infraStatus, result.infraChecks.length === 0 ? '✓' : '⚠'));
        // Security Check
        const securityStatus = result.securityChecks.length === 0
            ? ['✓ Security requirements are met']
            : result.securityChecks;
        sections.push(formatValidationSection('Security Check', securityStatus, result.securityChecks.length === 0 ? '✓' : '⚠'));
        // Development Environment
        const devEnvStatus = result.devContainerChecks.length === 0
            ? ['✓ Development environment is properly configured']
            : result.devContainerChecks;
        sections.push(formatValidationSection('Development Environment', devEnvStatus, result.devContainerChecks.length === 0 ? '✓' : '⚠'));
        // GitHub Workflows
        const workflowStatus = result.workflowChecks.length === 0
            ? ['✓ GitHub workflows are properly configured']
            : result.workflowChecks;
        sections.push(formatValidationSection('GitHub Workflows', workflowStatus, result.workflowChecks.length === 0 ? '✓' : '⚠'));
        // Additional Warnings
        if (result.warnings.length > 0) {
            sections.push(formatValidationSection('Additional Recommendations', result.warnings, '💡'));
        }
        // Overall Status
        const totalIssues = result.errors.length +
            result.readmeIssues.length +
            result.infraChecks.length +
            result.securityChecks.length +
            result.devContainerChecks.length +
            result.workflowChecks.length;
        const statusIcon = totalIssues === 0 ? '✅' : (result.errors.length > 0 ? '❌' : '⚠');
        sections.push(`\n## Overall Status ${statusIcon}
${totalIssues === 0
            ? '✨ Template validation passed all checks successfully!'
            : `Template needs attention:
• ${result.errors.length} critical issues
• ${totalIssues - result.errors.length} recommendations/warnings
`}`);
        return {
            content: [
                {
                    type: "text",
                    text: sections.join('\n')
                }
            ]
        };
    });
    server.tool("create-template", "Create a new Azure Developer CLI (azd) template with best practices", {
        name: zod_1.z.string().min(2).describe('Name of the template'),
        language: zod_1.z.enum(['typescript', 'python', 'java', 'dotnet', 'other']).describe('Primary programming language'),
        architecture: zod_1.z.enum(['web', 'api', 'function', 'container', 'other']).describe('Application architecture'),
        outputPath: zod_1.z.string().describe('Path where the template should be created').optional()
    }, async ({ name, language, architecture, outputPath }) => {
        const result = await (0, azd_tools_js_1.createTemplate)({ name, language, architecture, outputPath });
        if (!result.success) {
            return {
                content: [
                    {
                        type: "text",
                        text: result.message
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `# Template Created Successfully 🎉

Template '${name}' has been created with:
- Language: ${language}
- Architecture: ${architecture}
- Location: ${outputPath}

## Next Steps
1. Navigate to the template directory:
   \`cd ${outputPath}\`

2. Initialize the environment:
   \`azd init\`

3. Review and customize:
   - Update the architecture diagram in README.md
   - Modify the Bicep templates in infra/
   - Customize the application code in src/

4. Test the template:
   \`azd up\`

The template includes:
✅ Best practice directory structure
✅ Infrastructure as Code (Bicep)
✅ CI/CD workflows
✅ Dev Container configuration
✅ Security and contribution guidelines

For more details, check the README.md in your new template directory.`
                }
            ]
        };
    });
}
// Initialize and start the server
async function main() {
    const server = (0, exports.createServer)();
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("AZD Template Helper MCP Server running on stdio");
    return server;
}
// Run when executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error("Fatal error in main():", error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map