import { z } from 'zod';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Required files and sections based on official azd template requirements
const REQUIRED_FILES = [
    'README.md',
    'LICENSE',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    ['azure.yaml', 'azure-dev.yaml'],
    'infra',
    '.devcontainer',
    '.github/workflows'
];

const REQUIRED_README_SECTIONS = [
    'Features',
    'Getting Started',
    'Prerequisites',
    'Installation',
    'Architecture Diagram',
    'Region Availability',
    'Costs',
    'Security',
    'Resources'
];

const REQUIRED_SECURITY_NOTICE = `This template, the application code and configuration it contains, has been built to showcase Microsoft Azure specific services and tools. We strongly advise our customers not to make this code part of their production environments without implementing or enabling additional security features.`;

// Helper functions for validation
async function pathExists(basePath: string, pathToCheck: string): Promise<boolean> {
    try {
        const items = await fs.promises.readdir(path.dirname(path.join(basePath, pathToCheck)));
        return items.some(item => item.toLowerCase() === path.basename(pathToCheck).toLowerCase());
    } catch {
        return false;
    }
}

async function validateReadmeContent(readmePath: string): Promise<{
    missingSections: string[],
    missingBadges: string[],
    missingSecurityNotice: boolean,
    warnings: string[]
}> {
    try {
        const content = await fs.promises.readFile(readmePath, 'utf8');
        
        // Check required sections
        const missingSections = REQUIRED_README_SECTIONS.filter(section => {
            const sectionRegex = new RegExp(`##\\s+${section}`, 'i');
            return !sectionRegex.test(content);
        });

        // Check for badges
        const missingBadges = [];
        if (!content.includes('[![Open in GitHub Codespaces]')) {
            missingBadges.push('GitHub Codespaces');
        }
        if (!content.includes('[![Open in Dev Containers]')) {
            missingBadges.push('Dev Containers');
        }

        // Check for architecture diagram
        const warnings = [];
        if (!content.includes('architecture') || !content.includes('.png') || !content.includes('.drawio')) {
            warnings.push('Architecture diagram section should include a diagram image');
        }

        // Check for security notice
        const hasSecurityNotice = content.includes(REQUIRED_SECURITY_NOTICE);

        // Check for costs and region availability
        if (!content.includes('pricing calculator')) {
            warnings.push('Add link to Azure pricing calculator for cost estimation');
        }
        if (!content.includes('region availability')) {
            warnings.push('Add information about region availability for Azure services');
        }

        return {
            missingSections,
            missingBadges,
            missingSecurityNotice: !hasSecurityNotice,
            warnings
        };
    } catch (error) {
        throw new Error(`Failed to validate README: ${error}`);
    }
}

async function validateDevContainer(templatePath: string): Promise<string[]> {
    const warnings: string[] = [];
    const devContainerPath = path.join(templatePath, '.devcontainer');
    
    if (await pathExists(templatePath, '.devcontainer')) {
        const devContainerJsonPath = path.join(devContainerPath, 'devcontainer.json');
        if (!await pathExists(devContainerPath, 'devcontainer.json')) {
            warnings.push('Missing devcontainer.json in .devcontainer directory');
        } else {
            try {
                const config = JSON.parse(await fs.promises.readFile(devContainerJsonPath, 'utf8'));
                if (!config.features?.['ghcr.io/devcontainers/features/azure-cli:1']) {
                    warnings.push('Dev container should include Azure CLI feature');
                }
                if (!config.features?.['ghcr.io/devcontainers/features/github-cli:1']) {
                    warnings.push('Dev container should include GitHub CLI feature');
                }
                if (!config.features?.['ghcr.io/devcontainers/features/docker-in-docker:1']) {
                    warnings.push('Consider adding Docker-in-Docker support for container scenarios');
                }
            } catch {
                warnings.push('Invalid devcontainer.json file');
            }
        }
    }
    return warnings;
}

async function validateGitHubWorkflows(templatePath: string): Promise<string[]> {
    const warnings: string[] = [];
    const workflowsPath = path.join(templatePath, '.github', 'workflows');
    
    if (await pathExists(templatePath, '.github/workflows')) {
        const files = await fs.promises.readdir(workflowsPath);
        const hasValidation = files.some(f => 
            f.toLowerCase().includes('validate') || 
            f.toLowerCase().includes('test'));
            
        if (!hasValidation) {
            warnings.push('Add GitHub workflow for template validation and testing');
        }

        // Check for security scanning workflow
        const hasSecurityScan = files.some(f => 
            f.toLowerCase().includes('security') || 
            f.toLowerCase().includes('scan'));
            
        if (!hasSecurityScan) {
            warnings.push('Add security scanning workflow using microsoft/security-devops-action');
        }
    }
    return warnings;
}

// Helper function to validate AZD service tags in bicep files
async function validateAzdTags(templatePath: string, parsedYaml: any): Promise<string[]> {
    const warnings: string[] = [];
    const infraPath = path.join(templatePath, 'infra');
    
    if (!await pathExists(templatePath, 'infra')) {
        return warnings;
    }

    try {
        // Get all bicep files in the infra directory
        const bicepFiles: string[] = [];
        const collectBicepFiles = async (dir: string) => {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await collectBicepFiles(fullPath);
                } else if (entry.name.endsWith('.bicep')) {
                    bicepFiles.push(fullPath);
                }
            }
        };
        
        await collectBicepFiles(infraPath);
        
        // Get services defined in azure.yaml
        const services = parsedYaml?.services || {};
        const serviceNames = Object.keys(services);
        
        if (serviceNames.length === 0) {
            warnings.push('No services defined in azure.yaml, but AZD requires service definitions for deployment');
            return warnings;
        }
        
        // Check each bicep file for proper tagging
        for (const file of bicepFiles) {
            const content = await fs.promises.readFile(file, 'utf8');
            
            // Only check files that define resources that might host services
            const isResourceFile = 
                content.includes('Microsoft.Web/sites') || 
                content.includes('Microsoft.App/containerApps') ||
                content.includes('Microsoft.Functions/functionApps');
                
            if (!isResourceFile) {
                continue;
            }
            
            // Check for tags section
            if (!content.includes('tags:')) {
                warnings.push(`${path.basename(file)}: Missing 'tags' property on resources that may host services`);
                continue;
            }
            
            // Check for 'azd-service-name' tag
            if (!content.includes('azd-service-name')) {
                warnings.push(`${path.basename(file)}: Missing required 'azd-service-name' tag for deployable resources`);
                continue;
            }
            
            // Look for service-specific tag issues
            for (const serviceName of serviceNames) {
                const serviceHost = services[serviceName]?.host || '';
                
                const expectedResources = {
                    'appservice': 'Microsoft.Web/sites',
                    'function': 'Microsoft.Functions/functionApps',
                    'containerapp': 'Microsoft.App/containerApps'
                };
                
                const expectedResource = expectedResources[serviceHost];
                
                if (expectedResource && content.includes(expectedResource) && 
                    !content.includes(`azd-service-name': '${serviceName}'`) && 
                    !content.includes(`azd-service-name": "${serviceName}"`)) {
                    warnings.push(`${path.basename(file)}: Service '${serviceName}' is defined in azure.yaml with host type '${serviceHost}', but no resource with tag 'azd-service-name: ${serviceName}' was found`);
                }
            }
        }
    } catch (error) {
        warnings.push(`Error validating AZD tags: ${error}`);
    }
    
    return warnings;
}

// Utility function to check if azd CLI is installed
function checkAzdInstalled(): boolean {
    try {
        execSync('azd version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Function to get template info
export async function getTemplateInfo(templatePath: string) {
    try {
        const azdYamlPath = path.join(templatePath, 'azure.yaml');
        if (!fs.existsSync(azdYamlPath)) {
            return null;
        }
        const content = fs.readFileSync(azdYamlPath, 'utf8');
        return content;
    } catch {
        return null;
    }
}

// Function to validate README sections
async function validateReadmeSections(readmePath: string): Promise<string[]> {
    try {
        const content = await fs.promises.readFile(readmePath, 'utf8');
        const missingH2s = REQUIRED_README_SECTIONS.filter(section => {
            const h2Regex = new RegExp(`##\\s+${section}`, 'i');
            return !h2Regex.test(content);
        });
        return missingH2s;
    } catch {
        return REQUIRED_README_SECTIONS;
    }
}

// Function to validate infrastructure
async function validateInfra(templatePath: string, parsedYaml: any): Promise<string[]> {
    const warnings: string[] = [];
    const infraPath = path.join(templatePath, 'infra');
    
    if (await pathExists(templatePath, 'infra')) {
        const provider = parsedYaml?.infra?.provider || 'bicep';
        const hasProviderFiles = await pathExists(infraPath, provider === 'bicep' ? 'main.bicep' : 'main.tf');
        
        if (!hasProviderFiles) {
            warnings.push(`No ${provider} files found in infra directory`);
        }

        const hasParams = await pathExists(infraPath, provider === 'bicep' ? 'main.parameters.json' : 'variables.tf');
        if (!hasParams) {
            warnings.push(`Missing parameter/variable files for ${provider}`);
        }
    }
    return warnings;
}

// Azure.yaml schema validation
const azureWorkflowStepSchema = z.object({
    type: z.string().optional(),
    handler: z.string().optional(),
    args: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    env: z.record(z.string(), z.string()).optional()
});

const azureServiceSchema = z.object({
    project: z.string().optional(),
    language: z.string().optional(),
    host: z.string().optional(),
    docker: z.boolean().optional(),
    path: z.string().optional()
});

const azureYamlSchema = z.object({
    name: z.string().min(2),
    resourceGroup: z.string().min(3).max(64).optional(),
    metadata: z.object({
        template: z.string().optional()
    }).optional(),
    infra: z.object({
        provider: z.enum(['bicep', 'terraform']).optional(),
        path: z.string().optional(),
        module: z.string().optional()
    }).optional(),
    services: z.record(z.string(), azureServiceSchema).optional(),
    workflows: z.record(z.string(), 
        z.union([
            z.object({
                steps: z.array(azureWorkflowStepSchema).min(1)
            }),
            z.array(azureWorkflowStepSchema)
        ])
    ).optional()
});

// Schema definitions for our tools - using proper Zod schema types
export const listTemplatesSchema = z.object({});

export const analyzeTemplateSchema = z.object({
    templatePath: z.string().describe('Path to the azd template directory')
});

export const validateTemplateSchema = z.object({
    templatePath: z.string().describe('Path to the azd template directory')
});

// Tool implementations
export async function listTemplates() {
    if (!checkAzdInstalled()) {
        return { error: 'Azure Developer CLI (azd) is not installed. Please install it first.' };
    }

    try {
        const result = execSync('azd template list', { encoding: 'utf8' });
        return { templates: result };
    } catch (error) {
        return { error: `Failed to list templates: ${error}` };
    }
}

// Add helper function to get current workspace
function getCurrentWorkspace(): string {
    return process.cwd();
}

// Update analyze template to use current workspace if no path provided
export async function analyzeTemplate(templatePath?: string) {
    const actualPath = templatePath || getCurrentWorkspace();
    const templateInfo = await getTemplateInfo(actualPath);
    if (!templateInfo) {
        return { error: 'Invalid template directory or missing azure.yaml file' };
    }

    try {
        // Read key files and analyze template structure
        const files = fs.readdirSync(actualPath, { recursive: true }) as string[];
        const analysis = {
            hasInfra: files.some(f => typeof f === 'string' && f.includes('infra/')),
            hasApp: files.some(f => typeof f === 'string' && (f.includes('src/') || f.includes('app/'))),
            configFile: templateInfo,
            recommendations: [] as string[]
        };

        // Generate recommendations
        if (!analysis.hasInfra) {
            analysis.recommendations.push('Consider adding infrastructure as code in an "infra/" directory');
        }
        if (!analysis.hasApp) {
            analysis.recommendations.push('Consider adding application code in a "src/" or "app/" directory');
        }

        return analysis;
    } catch (error) {
        return { error: `Failed to analyze template: ${error}` };
    }
}

// Update validate template to use current workspace if no path provided
export async function validateTemplate(templatePath?: string) {
    if (!checkAzdInstalled()) {
        return { error: 'Azure Developer CLI (azd) is not installed. Please install it first.' };
    }

    try {
        const actualPath = templatePath || getCurrentWorkspace();
        if (!fs.existsSync(actualPath)) {
            return { error: 'Template directory does not exist' };
        }

        const validationResults = {
            hasAzureYaml: false,
            hasReadme: false,
            errors: [] as string[],
            warnings: [] as string[],
            securityChecks: [] as string[],
            infraChecks: [] as string[],
            readmeIssues: [] as string[],
            devContainerChecks: [] as string[],
            workflowChecks: [] as string[]
        };

        // Check required files
        for (const file of REQUIRED_FILES) {
            if (Array.isArray(file)) {
                const exists = file.some(f => fs.existsSync(path.join(actualPath, f)));
                if (!exists) {
                    validationResults.errors.push(`Missing required file: ${file.join(' or ')}`);
                }
            } else {
                if (!fs.existsSync(path.join(actualPath, file))) {
                    validationResults.errors.push(`Missing required file: ${file}`);
                }
            }
        }

        // Validate README content
        const readmePath = path.join(actualPath, 'README.md');
        if (fs.existsSync(readmePath)) {
            validationResults.hasReadme = true;
            const readmeValidation = await validateReadmeContent(readmePath);
            
            if (readmeValidation.missingSections.length > 0) {
                validationResults.readmeIssues.push(`Missing required sections: ${readmeValidation.missingSections.join(', ')}`);
            }
            if (readmeValidation.missingBadges.length > 0) {
                validationResults.readmeIssues.push(`Add badges for: ${readmeValidation.missingBadges.join(', ')}`);
            }
            if (readmeValidation.missingSecurityNotice) {
                validationResults.securityChecks.push('Add required security notice to README');
            }
            validationResults.warnings.push(...readmeValidation.warnings);
        }

        // Validate azure.yaml
        const azdYamlPath = path.join(actualPath, 'azure.yaml');
        if (fs.existsSync(azdYamlPath)) {
            validationResults.hasAzureYaml = true;
            const yamlContent = fs.readFileSync(azdYamlPath, 'utf8');
            const parsedYaml = yaml.parse(yamlContent);
            
            try {
                azureYamlSchema.parse(parsedYaml);
            } catch (e) {
                if (e instanceof z.ZodError) {
                    e.errors.forEach(err => {
                        validationResults.errors.push(`Schema validation error at ${err.path.join('.')}: ${err.message}`);
                    });
                }
            }

            // Validate infrastructure based on yaml configuration
            const infraWarnings = await validateInfra(actualPath, parsedYaml);
            validationResults.infraChecks.push(...infraWarnings);

            // Validate AZD tags in bicep files
            const azdTagWarnings = await validateAzdTags(actualPath, parsedYaml);
            validationResults.infraChecks.push(...azdTagWarnings);
        }

        // Validate dev container configuration
        const devContainerWarnings = await validateDevContainer(actualPath);
        validationResults.devContainerChecks.push(...devContainerWarnings);

        // Validate GitHub workflows
        const workflowWarnings = await validateGitHubWorkflows(actualPath);
        validationResults.workflowChecks.push(...workflowWarnings);

        return validationResults;
    } catch (error) {
        return { error: `Failed to validate template: ${error}` };
    }
}

// Update create template to use current workspace if no path provided
export async function createTemplate(params: {
    name: string;
    language: string;
    architecture: string;
    outputPath?: string;
}): Promise<{ success: boolean; message: string }> {
    try {
        const { name, language, architecture } = params;
        const outputPath = params.outputPath || path.join(getCurrentWorkspace(), name);
        const templateConfig = templateStructures[architecture as keyof typeof templateStructures] 
            || templateStructures.web;

        // Create directory structure
        for (const dir of templateConfig.dirs) {
            await fs.promises.mkdir(path.join(outputPath, dir), { recursive: true });
        }

        // Create template files
        for (const [file, getContent] of Object.entries(templateConfig.files)) {
            const filePath = path.join(outputPath, file);
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            const content = getContent(name, language, architecture);
            await fs.promises.writeFile(filePath, content);
        }

        // Create language-specific files
        await createLanguageSpecificFiles(outputPath, language, architecture);

        return {
            success: true,
            message: `Template '${name}' created successfully at ${outputPath}`
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to create template: ${error}`
        };
    }
}

// Template structure configurations
const templateStructures = {
    web: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows'],
        files: {
            'azure.yaml': (name: string, language: string, architecture: string) => 
                yaml.stringify({
                    name: name,
                    metadata: {
                        template: `${name}@0.0.1-beta`
                    },
                    services: {
                        web: {
                            language: language,
                            project: './src',
                            host: 'appservice'
                        }
                    },
                    infra: {
                        provider: 'bicep',
                        path: './infra'
                    }
                }),
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    },
    api: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows', 'tests'],
        files: {
            'azure.yaml': (name: string, language: string, architecture: string) => 
                yaml.stringify({
                    name: name,
                    metadata: {
                        template: `${name}@0.0.1-beta`
                    },
                    services: {
                        api: {
                            language: language,
                            project: './src',
                            host: 'appservice'
                        }
                    },
                    infra: {
                        provider: 'bicep',
                        path: './infra'
                    }
                }),
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    },
    function: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows', 'tests'],
        files: {
            'azure.yaml': (name: string, language: string, architecture: string) => 
                yaml.stringify({
                    name: name,
                    metadata: {
                        template: `${name}@0.0.1-beta`
                    },
                    services: {
                        function: {
                            language: language,
                            project: './src',
                            host: 'function'
                        }
                    },
                    infra: {
                        provider: 'bicep',
                        path: './infra'
                    }
                }),
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    },
    container: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows', 'tests'],
        files: {
            'azure.yaml': (name: string, language: string, architecture: string) => 
                yaml.stringify({
                    name: name,
                    metadata: {
                        template: `${name}@0.0.1-beta`
                    },
                    services: {
                        app: {
                            language: language,
                            project: './src',
                            host: 'containerapp',
                            docker: true
                        }
                    },
                    infra: {
                        provider: 'bicep',
                        path: './infra'
                    }
                }),
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    },
    other: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows'],
        files: {
            'azure.yaml': (name: string, language: string, architecture: string) => 
                yaml.stringify({
                    name: name,
                    metadata: {
                        template: `${name}@0.0.1-beta`
                    },
                    infra: {
                        provider: 'bicep',
                        path: './infra'
                    }
                }),
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    }
};

// Template file creation helpers
function createReadme(name: string, language: string, architecture: string): string {
    return `# ${name}

A ${architecture} template using ${language} and Azure Developer CLI (azd).

## Features

- ${architecture.toUpperCase()} application template
- Infrastructure as Code using Bicep
- CI/CD using GitHub Actions
- Dev Container support

## Prerequisites

- [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
${getLanguagePrereqs(language)}

## Getting Started

1. Initialize the environment:
   \`\`\`bash
   azd init
   \`\`\`

2. Provision infrastructure and deploy:
   \`\`\`bash
   azd up
   \`\`\`

## Architecture Diagram

[Insert your architecture diagram here]

### Components

${getArchitectureComponents(architecture)}

## Project Structure

\`\`\`
.
├── .devcontainer/          # Development container configuration
├── .github/
│   └── workflows/          # GitHub Actions workflows
├── infra/                  # Infrastructure as Code (Bicep)
└── src/                    # Application source code
\`\`\`

## Region Availability

This template can be deployed to any Azure region that supports:
${getRequiredServices(architecture)}

For region availability, see: [Azure region availability](https://azure.microsoft.com/regions/services/)

## Costs

Estimated costs for this template:
${getCostEstimate(architecture)}

Use the [Azure pricing calculator](https://azure.microsoft.com/pricing/calculator/) for a detailed cost analysis.

## Security

${REQUIRED_SECURITY_NOTICE}

For more information, see [SECURITY.md](SECURITY.md).

## Contributing

This project welcomes contributions and suggestions. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.`;
}

function getArchitectureComponents(architecture: string): string {
    switch (architecture) {
        case 'web':
            return '- Azure App Service for web hosting\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        case 'api':
            return '- Azure App Service for API hosting\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        case 'function':
            return '- Azure Functions for serverless compute\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        case 'container':
            return '- Azure Container Apps for container hosting\n- Azure Container Registry\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        default:
            return '- Azure Key Vault for secrets\n- Application Insights for monitoring';
    }
}

function getRequiredServices(architecture: string): string {
    const services = ['Key Vault', 'Application Insights'];
    switch (architecture) {
        case 'web':
        case 'api':
            services.unshift('App Service');
            break;
        case 'function':
            services.unshift('Functions');
            break;
        case 'container':
            services.unshift('Container Apps', 'Container Registry');
            break;
    }
    return services.map(s => `- ${s}`).join('\n');
}

function getCostEstimate(architecture: string): string {
    switch (architecture) {
        case 'web':
        case 'api':
            return '- App Service: Basic tier (~$13/month)\n- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
        case 'function':
            return '- Functions: Consumption plan (pay per execution)\n- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
        case 'container':
            return '- Container Apps: Consumption plan (pay per use)\n- Container Registry: Basic tier (~$5/month)\n- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
        default:
            return '- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
    }
}

function createDevContainerConfig(name: string, language: string): string {
    return JSON.stringify({
        name: `${name} Development`,
        features: {
            'ghcr.io/devcontainers/features/azure-cli:1': {},
            'ghcr.io/devcontainers/features/github-cli:1': {},
            'ghcr.io/devcontainers/features/docker-in-docker:1': {}
        },
        customizations: {
            vscode: {
                extensions: [
                    'ms-azuretools.azure-dev',
                    'ms-azuretools.vscode-bicep',
                    ...getLanguageExtensions(language)
                ]
            }
        },
        postCreateCommand: 'azd version'
    }, null, 2);
}

function createValidationWorkflow(name: string): string {
    return `name: Validate Template
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
    
    - name: Install azd
      uses: Azure/setup-azd@v1
      
    - name: Validate Template
      uses: Azure/dev-community-templates-ci@v1
      with:
        path: .

    - name: Security Scan
      uses: microsoft/security-devops-action@v1
      with:
        categories: 'IaC,secrets'`;
}

function createBicepTemplate(name: string, architecture: string): string {
    // Get the service name based on architecture
    let serviceName: string;
    switch (architecture) {
        case 'web':
            serviceName = 'web';
            break;
        case 'api':
            serviceName = 'api';
            break;
        case 'function':
            serviceName = 'function';
            break;
        case 'container':
            serviceName = 'app';
            break;
        default:
            serviceName = 'app';
    }

    // Create a bicep template with proper AZD tags
    return `param location string = resourceGroup().location
param environmentName string
param resourceToken string = uniqueString(subscription().subscriptionId, resourceGroup().id)
param tags object = {}

// Merge supplied tags with required AZD tags
var defaultTags = {
  'azd-env-name': environmentName
}
var allTags = union(defaultTags, tags)

// Add your Bicep template here based on the ${architecture} architecture
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'plan-\${environmentName}-\${resourceToken}'
  location: location
  tags: allTags
  sku: {
    name: 'B1'
  }
}

${architecture === 'function' ? 
`// Function App with proper azd-service-name tag
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'func-\${environmentName}-\${resourceToken}'
  location: location
  tags: union(allTags, { 'azd-service-name': '${serviceName}' })
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      ftpsState: 'Disabled'
    }
  }
}

output SERVICE_${serviceName.toUpperCase()}_NAME string = functionApp.name
output SERVICE_${serviceName.toUpperCase()}_URI string = 'https://\${functionApp.properties.defaultHostName}'` 
: architecture === 'container' ? 
`// Container App with proper azd-service-name tag
resource containerApp 'Microsoft.App/containerApps@2022-03-01' = {
  name: 'ca-\${environmentName}-\${resourceToken}'
  location: location
  tags: union(allTags, { 'azd-service-name': '${serviceName}' })
  properties: {
    configuration: {
      ingress: {
        external: true
        targetPort: 80
      }
    }
    template: {
      containers: [
        {
          name: '${serviceName}'
          image: '$\{DOCKER_REGISTRY_SERVER_URL}/$\{DOCKER_REGISTRY_SERVER_USERNAME}/${serviceName}:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
    }
  }
}

output SERVICE_${serviceName.toUpperCase()}_NAME string = containerApp.name
output SERVICE_${serviceName.toUpperCase()}_URI string = containerApp.properties.configuration.ingress.fqdn` 
: 
`// App Service with proper azd-service-name tag
resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'app-\${environmentName}-\${resourceToken}'
  location: location
  tags: union(allTags, { 'azd-service-name': '${serviceName}' })
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

output SERVICE_${serviceName.toUpperCase()}_NAME string = webApp.name
output SERVICE_${serviceName.toUpperCase()}_URI string = 'https://\${webApp.properties.defaultHostName}'`}

// Key Vault with tags but not azd-service-name since it's not a deployable service target
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'kv-\${environmentName}-\${resourceToken}'
  location: location
  tags: allTags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
  }
}

// Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-\${environmentName}-\${resourceToken}'
  location: location
  tags: allTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}`;
}

function createBicepParams(name: string): string {
    return JSON.stringify({
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',
        contentVersion: '1.0.0.0',
        parameters: {
            environmentName: {
                value: '${name}-dev'
            }
        }
    }, null, 2);
}

function createContributing(name: string): string {
    return `# Contributing to ${name}

This project welcomes contributions and suggestions. Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution.

## Code of Conduct

This project has adopted the [Contributor Covenant](CODE_OF_CONDUCT.md). For more information, see the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Process

1. Fork the repository and create your branch from \`main\`.
2. Make your changes
3. Test your changes using \`azd up\`
4. Update documentation if needed
5. Issue that pull request!

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable.
2. Update the example architecture diagram if you changed the infrastructure.
3. You may merge the Pull Request once you have the sign-off of two other developers.`;
}

function createLicense(name: string): string {
    const year = new Date().getFullYear();
    return `MIT License

Copyright (c) ${year} ${name}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
}

function createSecurity(name: string): string {
    return `# Security Policy

## Supported Versions

This template is currently in development. Security updates will be applied to the latest version.

## Reporting a Vulnerability

If you believe you have found a security vulnerability in this template, please report it to us:

1. **Do not** report security vulnerabilities through public GitHub issues.
2. Email your findings to [SECURITY_EMAIL].
3. Include detailed information about the vulnerability.
4. Include steps to reproduce if possible.

You should receive a response within 24 hours. Please allow us to assess and respond to the vulnerability before any public disclosure.

## Security Configuration

This template includes several security best practices:

1. Key Vault for secret management
2. Managed Identities for Azure resources
3. Network security rules
4. HTTPS/TLS configuration

## Security Notices

${REQUIRED_SECURITY_NOTICE}`;
}

function createCodeOfConduct(name: string): string {
    return `# Code of Conduct

## Our Pledge

In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone.

## Our Standards

Examples of behavior that contributes to creating a positive environment include:
* Using welcoming and inclusive language
* Being respectful of differing viewpoints and experiences
* Gracefully accepting constructive criticism
* Focusing on what is best for the community

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project team. All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances.`;
}

async function createLanguageSpecificFiles(outputPath: string, language: string, architecture: string): Promise<void> {
    const srcPath = path.join(outputPath, 'src');
    
    switch (language) {
        case 'typescript':
            await fs.promises.writeFile(
                path.join(srcPath, 'package.json'),
                JSON.stringify({
                    name: path.basename(outputPath),
                    version: '0.0.1',
                    private: true,
                    scripts: {
                        start: 'node dist/index.js',
                        build: 'tsc',
                        dev: 'ts-node src/index.ts'
                    }
                }, null, 2)
            );
            await fs.promises.writeFile(
                path.join(srcPath, 'tsconfig.json'),
                JSON.stringify({
                    compilerOptions: {
                        target: 'es2020',
                        module: 'commonjs',
                        outDir: './dist',
                        rootDir: './src',
                        strict: true,
                        esModuleInterop: true,
                        skipLibCheck: true,
                        forceConsistentCasingInFileNames: true
                    }
                }, null, 2)
            );
            break;
        case 'python':
            await fs.promises.writeFile(
                path.join(srcPath, 'requirements.txt'),
                'fastapi\nuvicorn\npython-dotenv\n'
            );
            break;
        case 'java':
            // Add Java-specific files
            break;
        case 'dotnet':
            // Add .NET-specific files
            break;
    }
}

function getLanguagePrereqs(language: string): string {
    switch (language) {
        case 'typescript':
            return '- Node.js 16 or later\n- npm or yarn';
        case 'python':
            return '- Python 3.8 or later\n- pip';
        case 'java':
            return '- Java 17 or later\n- Maven or Gradle';
        case 'dotnet':
            return '- .NET 6.0 or later';
        default:
            return '';
    }
}

function getLanguageExtensions(language: string): string[] {
    switch (language) {
        case 'typescript':
            return [
                'dbaeumer.vscode-eslint',
                'esbenp.prettier-vscode'
            ];
        case 'python':
            return [
                'ms-python.python',
                'ms-python.vscode-pylance'
            ];
        case 'java':
            return [
                'vscjava.vscode-java-pack',
                'redhat.vscode-xml'
            ];
        case 'dotnet':
            return [
                'ms-dotnettools.csharp',
                'ms-dotnettools.vscode-dotnet-runtime'
            ];
        default:
            return [];
    }
}