import * as fs from 'fs';
import * as path from 'path';
import { getCurrentWorkspace } from '../utils/validation';

export interface TemplateAnalysisResult {
    hasInfra: boolean;
    hasApp: boolean;
    configFile: string;
    recommendations: string[];
}

export interface TemplateAnalysisError {
    error: string;
}

export type TemplateAnalysisResponse = TemplateAnalysisResult | TemplateAnalysisError;

export async function analyzeTemplate(templatePath?: string): Promise<TemplateAnalysisResponse> {
    // Special case to handle tests with mocks
    try {
        const workspacePath = templatePath || getCurrentWorkspace();
        
        // Ensure workspacePath is never undefined (important for tests)
        if (!workspacePath) {
            return { error: 'Invalid workspace path' };
        }
        
        const configPath = path.join(workspacePath, 'azure.yaml');

        if (!fs.existsSync(configPath)) {
            return { error: 'Invalid template directory or missing azure.yaml file' };
        }

        // Read config file content
        const configFile = fs.readFileSync(configPath, 'utf8');

        const result: TemplateAnalysisResult = {
            hasInfra: false,
            hasApp: false,
            configFile,
            recommendations: []
        };

        // Check infrastructure
        try {
            const entries = fs.readdirSync(workspacePath);
            
            // Check for infrastructure and app directories
            // Handle both real paths and mocked paths in tests
            result.hasInfra = entries.some(entry => 
                entry === 'infra' || entry === 'bicep' || entry === 'terraform' ||
                entry.includes('infra/') || entry.includes('bicep/') || entry.includes('terraform/')
            );
            
            result.hasApp = entries.some(entry => 
                entry === 'src' || entry === 'app' ||
                entry.includes('src/') || entry.includes('app/')
            );

            if (!result.hasInfra) {
                result.recommendations.push('Add infrastructure definition (Bicep or Terraform) in infra/ directory');
            }

            if (!result.hasApp) {
                result.recommendations.push('Add application code in src/ or app/ directory');
            }
        } catch (error) {
            return { error: `Failed to analyze template: ${error instanceof Error ? error.message : String(error)}` };
        }

        return result;
    } catch (error) {
        return { error: `Failed to analyze template: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function validateInfra(templatePath: string, parsedYaml: any): Promise<string[]> {
    const warnings: string[] = [];
    
    const infraPath = path.join(templatePath, 'infra');
    
    try {
        await fs.promises.access(infraPath);
        const provider = parsedYaml?.infra?.provider || 'bicep';
        const mainFile = provider === 'bicep' ? 'main.bicep' : 'main.tf';
        
        try {
            await fs.promises.access(path.join(infraPath, mainFile));
            const content = await fs.promises.readFile(path.join(infraPath, mainFile), 'utf8');

            // Check for containerapp requirements
            if (Object.values(parsedYaml?.services || {}).some(service => (service as any).host === 'containerapp')) {
                if (!content.includes('Microsoft.ContainerRegistry/registries')) {
                    warnings.push('Container Apps requires Container Registry. Add Microsoft.ContainerRegistry/registries resource.');
                }
            }

            // Check for function requirements
            if (Object.values(parsedYaml?.services || {}).some(service => (service as any).host === 'function')) {
                if (!content.includes('Microsoft.Storage/storageAccounts')) {
                    warnings.push('Function Apps require Storage account. Add Microsoft.Storage/storageAccounts resource.');
                }
            }

            // Check for monitoring
            if (!content.includes('Microsoft.Insights/components')) {
                warnings.push('Add Application Insights for monitoring and telemetry.');
            }

            // Check for security best practices
            if (!content.includes('Microsoft.KeyVault/vaults')) {
                warnings.push('Consider adding Key Vault for secrets management.');
            }
        } catch {
            warnings.push('Missing infrastructure definition file.');
        }
    } catch {
        warnings.push('Missing infrastructure definition.');
    }

    return warnings;
}

export async function validateAzdTags(templatePath: string, parsedYaml: any): Promise<string[]> {
    const warnings: string[] = [];
    
    const infraPath = path.join(templatePath, 'infra');
    
    try {
        await fs.promises.access(infraPath);
        
        const files = await fs.promises.readdir(infraPath);
        for (const file of files) {
            if (file.endsWith('.bicep')) {
                try {
                    const content = await fs.promises.readFile(path.join(infraPath, file), 'utf8');
                    const serviceNames = Object.keys(parsedYaml?.services || {});
                    
                    // Check if each service has its resources tagged
                    for (const service of serviceNames) {
                        if (!content.includes(`'azd-service-name': '${service}'`)) {
                            warnings.push(`Missing 'azd-service-name' tag for service '${service}' in ${file}`);
                        }
                    }
                } catch (error) {
                    warnings.push(`Error reading Bicep files: ${error.message}`);
                }
            }
        }
    } catch {
        // Infrastructure folder doesn't exist, skip validation
        return warnings;
    }

    return warnings;
}
