import * as fs from 'fs';
import * as path from 'path';

type AzdServiceHost = 'appservice' | 'function' | 'containerapp';
type ResourceTypeMap = {
    [K in AzdServiceHost]: string;
};

const isValidServiceHost = (host: any): host is AzdServiceHost => {
    return ['appservice', 'function', 'containerapp'].includes(host);
};

/**
 * Validates infrastructure configuration in a template
 */
export async function validateInfra(templatePath: string, parsedYaml: any): Promise<string[]> {
    const warnings: string[] = [];
    const infraPath = path.join(templatePath, 'infra');
    
    if (await fs.promises.access(infraPath).then(() => true, () => false)) {
        const provider = parsedYaml?.infra?.provider || 'bicep';
        const hasProviderFiles = await fs.promises.access(
            path.join(infraPath, provider === 'bicep' ? 'main.bicep' : 'main.tf')
        ).then(() => true, () => false);
        
        if (!hasProviderFiles) {
            warnings.push(`No ${provider} files found in infra directory`);
        }

        const hasParams = await fs.promises.access(
            path.join(infraPath, provider === 'bicep' ? 'main.parameters.json' : 'variables.tf')
        ).then(() => true, () => false);
        
        if (!hasParams) {
            warnings.push(`Missing parameter/variable files for ${provider}`);
        }
    }
    
    return warnings;
}

/**
 * Validates AZD service tags in infrastructure files
 */
export async function validateAzdTags(templatePath: string, parsedYaml: any): Promise<string[]> {
    const warnings: string[] = [];
    const infraPath = path.join(templatePath, 'infra');
    
    if (!await fs.promises.access(infraPath).then(() => true, () => false)) {
        return warnings;
    }

    try {
        // Get all bicep files
        const readDirRecursive = async (dir: string): Promise<string[]> => {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            const files = await Promise.all(entries.map(async entry => {
                const fullPath = path.join(dir, entry.name);
                return entry.isDirectory() ? readDirRecursive(fullPath) : fullPath;
            }));
            return files.flat();
        };
        
        const allFiles = await readDirRecursive(infraPath);
        const bicepFiles = allFiles.filter(file => file.endsWith('.bicep'));
        
        // Get services defined in azure.yaml
        const services = parsedYaml?.services || {};
        const serviceNames = Object.keys(services);
        
        if (serviceNames.length === 0) {
            warnings.push('No services defined in azure.yaml');
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
                warnings.push(`${path.basename(file)}: Missing 'tags' property on resources`);
                continue;
            }
            
            if (!content.includes('azd-service-name')) {
                warnings.push(`${path.basename(file)}: Missing 'azd-service-name' tag`);
                continue;
            }
            
            // Check service-specific tags
            for (const serviceName of serviceNames) {
                const serviceHost = services[serviceName]?.host;
                if (!isValidServiceHost(serviceHost)) {
                    warnings.push(`${path.basename(file)}: Invalid host type for service '${serviceName}'`);
                    continue;
                }

                const resourceTypes: ResourceTypeMap = {
                    'appservice': 'Microsoft.Web/sites',
                    'function': 'Microsoft.Functions/functionApps',
                    'containerapp': 'Microsoft.App/containerApps'
                };
                
                const resourceType = resourceTypes[serviceHost];
                
                if (resourceType && content.includes(resourceType)) {
                    const hasTag = content.includes(`'azd-service-name': '${serviceName}'`) || 
                                 content.includes(`"azd-service-name": "${serviceName}"`);
                    if (!hasTag) {
                        warnings.push(`${path.basename(file)}: Service '${serviceName}' missing tag`);
                    }
                }
            }
        }
    } catch (error) {
        warnings.push(`Error validating AZD tags: ${error}`);
    }
    
    return warnings;
}

export interface TemplateAnalysisResult {
    hasInfra: boolean;
    hasApp: boolean;
    configFile: string;
    recommendations: string[];
    error?: string;
}

export async function analyzeTemplate(templatePath?: string): Promise<TemplateAnalysisResult> {
    const workspacePathResolved = templatePath || process.cwd();
    
    // Check if directory exists
    if (!fs.existsSync(workspacePathResolved)) {
        return {
            error: 'Invalid template directory path',
            hasInfra: false,
            hasApp: false,
            configFile: '',
            recommendations: []
        };
    }

    try {
        const result: TemplateAnalysisResult = {
            hasInfra: false,
            hasApp: false,
            configFile: '',
            recommendations: []
        };

        // Check for azure.yaml
        const azureYamlPath = path.join(workspacePathResolved, 'azure.yaml');
        if (!fs.existsSync(azureYamlPath)) {
            return {
                error: 'Invalid template directory or missing azure.yaml file',
                hasInfra: false,
                hasApp: false,
                configFile: '',
                recommendations: []
            };
        }

        result.configFile = fs.readFileSync(azureYamlPath, 'utf8');

        // Check for infrastructure
        result.hasInfra = fs.existsSync(path.join(workspacePathResolved, 'infra'));
        if (!result.hasInfra) {
            result.recommendations.push('Add infrastructure as code (Bicep or Terraform) in the infra/ directory');
        }

        // Check for application code
        const entries = fs.readdirSync(workspacePathResolved);
        result.hasApp = entries.some(entry => 
            entry === 'src' || 
            fs.existsSync(path.join(workspacePathResolved, entry, 'package.json')) ||
            fs.existsSync(path.join(workspacePathResolved, entry, 'requirements.txt')) ||
            fs.existsSync(path.join(workspacePathResolved, entry, '*.csproj'))
        );

        if (!result.hasApp) {
            result.recommendations.push('Add application code in the src/ directory or service-specific folders');
        }

        return result;
    } catch (error) {
        return {
            error: `Failed to analyze template: ${error}`,
            hasInfra: false,
            hasApp: false,
            configFile: '',
            recommendations: []
        };
    }
}
