import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { execSync } from 'child_process';
import { TemplateValidationResult } from '../types';
import { REQUIRED_FILES } from '../constants/config';
import { azureYamlSchema } from '../schemas/validation';
import { pathExists, validateReadmeContent } from '../utils/validation';
import { generateMermaidFromBicep, insertMermaidDiagram } from './diagram-generation';

// Utility function to check if azd CLI is installed
function checkAzdInstalled(): boolean {
    try {
        execSync('azd version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Function to get current workspace
function getCurrentWorkspace(): string {
    return process.cwd();
}

// Validate dev container configuration
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

// Validate GitHub workflows
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

// Validate infrastructure
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

// Helper function to validate AZD service tags in bicep files
async function validateAzdTags(templatePath: string, parsedYaml: any): Promise<string[]> {
    const warnings: string[] = [];
    const infraPath = path.join(templatePath, 'infra');
    
    if (!await pathExists(templatePath, 'infra')) {
        return warnings;
    }

    try {
        // Get all bicep files
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
        
        // Check each bicep file
        for (const file of bicepFiles) {
            const content = await fs.promises.readFile(file, 'utf8');
            
            const isResourceFile = 
                content.includes('Microsoft.Web/sites') || 
                content.includes('Microsoft.App/containerApps') ||
                content.includes('Microsoft.Functions/functionApps');
                
            if (!isResourceFile) continue;
            
            if (!content.includes('tags:')) {
                warnings.push(`${path.basename(file)}: Missing 'tags' property on resources that may host services`);
                continue;
            }
            
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
                
                type ServiceHostType = keyof typeof expectedResources;
                const isValidServiceHost = (host: string): host is ServiceHostType => 
                    Object.keys(expectedResources).includes(host);
                
                if (serviceHost && isValidServiceHost(serviceHost)) {
                    const expectedResource = expectedResources[serviceHost];
                    
                    if (expectedResource && content.includes(expectedResource) && 
                        !content.includes(`azd-service-name': '${serviceName}'`) && 
                        !content.includes(`azd-service-name": "${serviceName}"`)) {
                        warnings.push(`${path.basename(file)}: Service '${serviceName}' is defined in azure.yaml with host type '${serviceHost}', but no resource with tag 'azd-service-name: ${serviceName}' was found`);
                    }
                }
            }
        }
    } catch (error) {
        warnings.push(`Error validating AZD tags: ${error}`);
    }
    
    return warnings;
}

// Main template validation function
export async function validateTemplate(templatePath?: string): Promise<TemplateValidationResult | { error: string }> {
    if (!checkAzdInstalled()) {
        return { error: 'Azure Developer CLI (azd) is not installed. Please install it first.' };
    }

    try {
        const actualPath = templatePath || getCurrentWorkspace();
        if (!fs.existsSync(actualPath)) {
            return { error: 'Template directory does not exist' };
        }

        const validationResults: TemplateValidationResult = {
            hasAzureYaml: false,
            hasReadme: false,
            errors: [],
            warnings: [],
            securityChecks: [],
            infraChecks: [],
            readmeIssues: [],
            devContainerChecks: [],
            workflowChecks: [],
            diagramAdded: false
        };        type RequiredFile = string | readonly string[];        // Check required files
        for (const file of [...REQUIRED_FILES] as RequiredFile[]) {
            if (Array.isArray(file)) {
                const exists = file.some(f => fs.existsSync(path.join(actualPath, f)));
                if (!exists) {
                    validationResults.errors.push(`Missing required file: ${file.join(' or ')}`);
                }
            } else {
                if (typeof file === 'string') {
                    if (!fs.existsSync(path.join(actualPath, file))) {
                        validationResults.errors.push(`Missing required file: ${file}`);
                    }
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
            
            // Check if README needs a Mermaid diagram
            if (
                (!readmeValidation.hasMermaidDiagram) && 
                await pathExists(actualPath, 'infra') &&
                !readmeValidation.missingSections.includes('Architecture Diagram')
            ) {
                validationResults.warnings.push('Consider adding a Mermaid diagram to visualize the architecture');
                
                // Generate and insert Mermaid diagram
                try {
                    const diagram = await generateMermaidFromBicep(actualPath);
                    if (await insertMermaidDiagram(readmePath, diagram)) {
                        validationResults.diagramAdded = true;
                        validationResults.warnings = validationResults.warnings.filter(
                            w => !w.includes('diagram')
                        );
                    }
                } catch (error) {
                    console.error(`Error generating/inserting diagram: ${error}`);
                }
            }
        }

        // Validate azure.yaml
        const azdYamlPath = path.join(actualPath, 'azure.yaml');
        if (fs.existsSync(azdYamlPath)) {
            validationResults.hasAzureYaml = true;
            const yamlContent = fs.readFileSync(azdYamlPath, 'utf8');
            const parsedYaml = yaml.parse(yamlContent);
            
            try {
                azureYamlSchema.parse(parsedYaml);
            } catch (e: any) {
                if (e.errors) {
                    e.errors.forEach((err: any) => {
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
