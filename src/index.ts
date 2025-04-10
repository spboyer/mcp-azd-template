import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
    listTemplates, 
    analyzeTemplate, 
    validateTemplate,
    createTemplate,
    searchTemplates,
    searchAiGallery
} from "./azd-tools";
import { z } from "zod";

// Export the tool functions for programmatic usage
export { 
    listTemplates, 
    analyzeTemplate, 
    validateTemplate, 
    createTemplate,
    searchTemplates,
    searchAiGallery
} from "./azd-tools";

// Create MCP server instance
export const createServer = (): McpServer => {
    const server = new McpServer({
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

// Helper function to format validation results
export function formatValidationSection(title: string, items: string[], icon: string = '•'): string {
    if (items.length === 0) return '';
    return `\n### ${title}\n${items.map(item => `${icon} ${item}`).join('\n')}`;
}

// Register tools on an MCP server instance
export function registerTools(server: McpServer): void {
    // Update list templates handler to handle error properly
    server.tool(
        "bb7_list-templates",
        "List all available Azure Developer CLI (azd) templates",
        {},
        async () => {
            const result = await listTemplates();
            return {
                content: [{
                    type: "text",
                    text: result.templates || result.error || 'No templates found'
                }]
            };
        }
    );
    
    // Update search templates handler to handle new return type
    server.tool(
        "bb7_search-templates",
        "Search for Azure Developer CLI (azd) templates by keyword",
        {
            query: z.string().describe("The query to search for templates with")
        },
        async ({ query }: { query: string }) => {
            const result = await searchTemplates(query);
            
            let responseText: string;
            if (result.error) {
                responseText = result.error;
            } else if (result.count === 0 || result.templates.includes('No templates found')) {
                responseText = result.templates;
            } else {
                responseText = `# Templates matching '${query}'\n\nFound ${result.count} templates:\n\n\`\`\`\n${result.templates}\n\`\`\``;
            }
              return {
                content: [{
                    type: "text",
                    text: responseText
                }]
            };
        }
    );

    server.tool(
        "bb7_search-ai-gallery",
        "Search for templates from the Azure AI gallery by keyword",
        {
            query: z.string().describe('The query to search for templates in the AI gallery')
        },
        async ({ query }: { query: string }) => {
            const result = await searchAiGallery(query);
            
            let responseText: string;
            if ('error' in result) {
                responseText = result.error ?? 'An unknown error occurred';
            } else if (result.count === 0) {
                responseText = `No AI gallery templates found matching: '${query}'`;
            } else {
                responseText = `# AI Gallery Templates matching '${query}'\n\nFound ${result.count} templates:\n\n\`\`\`\n${result.templates}\n\`\`\``;
            }
              return {
                content: [
                    {
                        type: "text",
                        text: responseText
                    }
                ]
            };
        }
    );

    server.tool(
        "bb7_analyze-template",
        "Analyze an Azure Developer CLI (azd) template directory and provide insights",
        {
            templatePath: z.string().describe('Path to the azd template directory').optional()
        },
        async ({ templatePath }) => {
            const result = await analyzeTemplate(templatePath);
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
        }
    );    server.tool(
        "bb7_validate-template",
        "Validate an Azure Developer CLI (azd) template directory for compliance with best practices",
        {
            templatePath: z.string().describe('Path to the azd template directory').optional()
        },
        async ({ templatePath }) => {
            const result = await validateTemplate(templatePath);
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

            const sections: string[] = ['# Template Validation Report'];

            // Critical Issues (Errors)
            if (result.errors.length > 0) {
                sections.push(formatValidationSection('Critical Issues', result.errors, '❌'));
            }

            // Documentation Check
            const docStatus = result.readmeIssues.length === 0 
                ? ['✓ Documentation meets all requirements']
                : result.readmeIssues;
            sections.push(formatValidationSection('Documentation Check', docStatus, 
                result.readmeIssues.length === 0 ? '✓' : '⚠'));

            // Infrastructure Check
            const infraStatus = result.infraChecks.length === 0
                ? ['✓ Infrastructure configuration is valid']
                : result.infraChecks;
            sections.push(formatValidationSection('Infrastructure Check', infraStatus,
                result.infraChecks.length === 0 ? '✓' : '⚠'));

            // Security Check
            const securityStatus = result.securityChecks.length === 0
                ? ['✓ Security requirements are met']
                : result.securityChecks;
            sections.push(formatValidationSection('Security Check', securityStatus,
                result.securityChecks.length === 0 ? '✓' : '⚠'));

            // Development Environment
            const devEnvStatus = result.devContainerChecks.length === 0
                ? ['✓ Development environment is properly configured']
                : result.devContainerChecks;
            sections.push(formatValidationSection('Development Environment', devEnvStatus,
                result.devContainerChecks.length === 0 ? '✓' : '⚠'));

            // GitHub Workflows
            const workflowStatus = result.workflowChecks.length === 0
                ? ['✓ GitHub workflows are properly configured']
                : result.workflowChecks;
            sections.push(formatValidationSection('GitHub Workflows', workflowStatus,
                result.workflowChecks.length === 0 ? '✓' : '⚠'));

            // Additional Warnings
            if (result.warnings.length > 0) {
                sections.push(formatValidationSection('Additional Recommendations', result.warnings, '💡'));
            }

            // Report if a Mermaid diagram was added
            if (result.diagramAdded) {
                sections.push('\n## 🔄 Automatic Updates Applied\n✅ A Mermaid architecture diagram was generated from your infrastructure code and added to the README.md file.');
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
        }
    );    server.tool(
        "bb7_create-template",
        "Create a new Azure Developer CLI (azd) template with best practices",
        {
            name: z.string().min(2).describe('Name of the template'),
            language: z.enum(['typescript', 'python', 'java', 'dotnet', 'other']).describe('Primary programming language'),
            architecture: z.enum(['web', 'api', 'function', 'container', 'other']).describe('Application architecture'),
            outputPath: z.string().describe('Path where the template should be created').optional()
        },
        async ({ name, language, architecture, outputPath }) => {
            const result = await createTemplate({ name, language, architecture, outputPath });
            
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
        }
    );
}

// Initialize and start the server
export async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
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