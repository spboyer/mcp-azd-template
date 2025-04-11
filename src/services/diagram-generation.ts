import * as fs from 'fs';
import * as path from 'path';
import { ResourceDefinition } from '../types';
import { pathExists } from '../utils/validation';

export async function checkForMermaidDiagram(readmePath: string): Promise<boolean> {
    try {
        const content = await fs.promises.readFile(readmePath, 'utf8');
        return content.includes('```mermaid') || content.includes('~~~mermaid');
    } catch (error) {
        console.error(`Error checking for Mermaid diagram: ${error}`);
        return false;
    }
}

export async function generateMermaidFromBicep(templatePath: string): Promise<{ diagram: string }> {
    const infraPath = path.join(templatePath, 'infra');
    let mainBicepPath = '';
    let resources: { [key: string]: ResourceDefinition } = {};
    
    try {
        // Find the main.bicep file
        if (await pathExists(templatePath, 'infra/main.bicep')) {
            mainBicepPath = path.join(infraPath, 'main.bicep');
        } else {
            // Try to find any bicep file if main.bicep doesn't exist
            const entries = await fs.promises.readdir(infraPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.bicep')) {
                    mainBicepPath = path.join(infraPath, entry.name);
                    break;
                }
            }
        }
        
        if (!mainBicepPath) {
            return { diagram: createDefaultMermaidDiagram() };
        }
        
        // Parse the bicep file
        const content = await fs.promises.readFile(mainBicepPath, 'utf8');
        
        // Extract resource definitions
        const resourceRegex = /resource\s+(\w+)\s+'([^']+)'/g;
        let match;
        
        while ((match = resourceRegex.exec(content)) !== null) {
            const resourceName = match[1];
            const resourceType = match[2];
            resources[resourceName] = { 
                type: resourceType, 
                connections: [],
                properties: {}
            };
        }
        
        // Extract resource properties and detect connections
        for (const resourceName of Object.keys(resources)) {
            const resourceRegex = new RegExp(`resource\\s+${resourceName}\\s+'[^']+'[^{]*{([^}]*)}`, 's');
            const resourceMatch = resourceRegex.exec(content);
            
            if (resourceMatch) {
                const resourceBlock = resourceMatch[1];
                
                // Look for explicit dependencies
                const dependsOnMatch = /dependsOn:\s*\[([\s\S]*?)\]/i.exec(resourceBlock);
                if (dependsOnMatch) {
                    const dependencies = dependsOnMatch[1]
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line && !line.startsWith('//'))
                        .map(line => line.replace(/,$/, '')) // Remove trailing commas
                        .filter(Boolean);
                        
                    resources[resourceName].connections.push(...dependencies);
                }
                
                // Look for resource references in properties
                for (const otherResource of Object.keys(resources)) {
                    if (resourceName !== otherResource) {
                        // Check for common reference patterns
                        const referencePatterns = [
                            `${otherResource}.id`,
                            `${otherResource}.name`,
                            `${otherResource}.properties`
                        ];
                        
                        if (referencePatterns.some(pattern => resourceBlock.includes(pattern))) {
                            resources[resourceName].connections.push(otherResource);
                        }
                    }
                }
                
                // Extract common properties
                const nameMatch = /name:\s*['"]([^'"]+)['"]/.exec(resourceBlock);
                if (nameMatch) {
                    resources[resourceName].properties = resources[resourceName].properties || {};
                    resources[resourceName].properties.name = nameMatch[1];
                }
                
                // Extract AZD service tags
                const serviceTagMatch = /tags:[\s\S]*?['"]azd-service-name['"]:\s*['"]([^'"]+)['"]/.exec(resourceBlock);
                if (serviceTagMatch) {
                    resources[resourceName].properties = resources[resourceName].properties || {};
                    resources[resourceName].properties.service = serviceTagMatch[1];
                }
            }
        }
        
        return { diagram: generateMermaidDiagram(resources) };
    } catch (error) {
        console.error(`Error generating Mermaid diagram: ${error}`);
        return { diagram: createDefaultMermaidDiagram() };
    }
}

export function generateMermaidDiagram(resources: { [key: string]: ResourceDefinition }): string {
    let mermaid = 'graph TD\n';
      // Add nodes and track connections
    const connections = new Set<string>();
    
    // First pass - add all nodes
    for (const [resourceName, resource] of Object.entries(resources)) {
        const shortType = resource.type.split('/').pop() || resource.type;
        const displayName = resource.properties?.name || resourceName;
        const serviceTag = resource.properties?.service ? ` (${resource.properties.service})` : '';
        
        // Choose icon based on resource type
        let icon = '📦';
        if (resource.type.includes('Microsoft.Web/sites')) {
            icon = '🌐';
        } else if (resource.type.includes('Microsoft.App/containerApps')) {
            icon = '🐳';
        } else if (resource.type.includes('Microsoft.Functions/functionApps')) {
            icon = '⚡';
        } else if (resource.type.includes('Microsoft.KeyVault/vaults')) {
            icon = '🔐';
        } else if (resource.type.includes('Microsoft.Storage/storageAccounts')) {
            icon = '💾';
        } else if (resource.type.includes('Microsoft.Sql/servers')) {
            icon = '🗄️';
        } else if (resource.type.includes('Microsoft.DocumentDB')) {
            icon = '🔄';
        } else if (resource.type.includes('Microsoft.Insights/components')) {
            icon = '📊';
        } else if (resource.type.includes('Microsoft.Network')) {
            icon = '🔌';
        }
        
        mermaid += `    ${resourceName}["${icon} ${displayName}\\n${shortType}${serviceTag}"]\n`;
    }    // Add all connections
    for (const [resourceName, resource] of Object.entries(resources)) {
        // Check for both explicit and implicit connections
        const checkConnection = (targetName: string) => {
            if (resourceName !== targetName && !connections.has(`${resourceName}-->${targetName}`)) {
                const resourceStr = JSON.stringify(resource);
                if (
                    (resource.connections && resource.connections.includes(targetName)) ||
                    resourceStr.includes(`${targetName}.id`) ||
                    resourceStr.includes(`${targetName}.name`) ||
                    resourceStr.includes(`${targetName}.properties`) ||
                    (resource.type.includes('Microsoft.Web/sites') && targetName === 'appServicePlan') ||
                    (resourceStr.includes('serverFarmId') && targetName === 'appServicePlan')
                ) {
                    mermaid += `    ${resourceName} --> ${targetName}\n`;
                    connections.add(`${resourceName}-->${targetName}`);
                    return true;
                }
            }
            return false;
        };

        // Check connections for each resource
        for (const otherName of Object.keys(resources)) {
            checkConnection(otherName);
        }
    }
    
    return mermaid;
}

export function createDefaultMermaidDiagram(): string {
    return `graph TD
    User[👤 User] --> FrontEnd[🌐 Frontend]
    FrontEnd --> API[🔌 API Service]
    API --> Database[(🗄️ Database)]
    API --> Storage[💾 Storage]
    API --> KeyVault[🔐 Key Vault]
    note[This is a placeholder diagram. Replace with actual architecture.]`;
}

export async function insertMermaidDiagram(readmePath: string, diagram: string): Promise<boolean> {
    try {
        let content = await fs.promises.readFile(readmePath, 'utf8');
        
        // Look for an Architecture section to place the diagram in
        const architectureSectionRegex = /(##\s+Architecture\s+Diagram\s*\n)/i;
        if (architectureSectionRegex.test(content)) {
            // Insert after the heading
            content = content.replace(
                architectureSectionRegex,
                `$1\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\n_This diagram was automatically generated from your infrastructure code._\n\n`
            );
        } else {
            // If no Architecture section, add it before the Requirements section
            const requirementsSectionRegex = /(##\s+Requirements\s*\n)/i;
            if (requirementsSectionRegex.test(content)) {
                content = content.replace(
                    requirementsSectionRegex,
                    `## Architecture Diagram\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\n_This diagram was automatically generated from your infrastructure code._\n\n$1`
                );
            } else {
                // If no Requirements section, add it at the end of the file
                content += `\n## Architecture Diagram\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\n_This diagram was automatically generated from your infrastructure code._\n`;
            }
        }
        
        await fs.promises.writeFile(readmePath, content, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error inserting Mermaid diagram: ${error}`);
        return false;
    }
}
