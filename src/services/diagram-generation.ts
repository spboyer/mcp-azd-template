import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ResourceDefinition } from '../types';
import { pathExists } from '../utils/validation';
import { renderMermaidToPng } from './mermaid-renderer';

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
        }        // Generate the diagram
        const diagramContent = generateMermaidDiagram(resources);
        // We'll let the insertMermaidDiagram function handle the PNG generation
        return { diagram: diagramContent };
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
        const readmeContent = await fs.promises.readFile(readmePath, 'utf8');
        
        // Only insert if there isn't already a diagram
        if (!await checkForMermaidDiagram(readmePath)) {
            // Find the Architecture section
            const architectureMatch = readmeContent.match(/##\s*Architecture/i);
            if (architectureMatch) {
                const position = architectureMatch.index! + architectureMatch[0].length;
                
                console.log('Generating PNG image from mermaid diagram...');
                // Try to generate PNG image using our installed packages
                const pngFileName = await generatePngFromMermaid(diagram, readmePath);
                
                let diagramContent;
                if (pngFileName) {
                    console.log(`Successfully created PNG diagram: ${pngFileName}`);
                    // Add both PNG image reference and collapsible mermaid source for easy editing
                    diagramContent = `\n\n![Architecture Diagram](images/${pngFileName})\n\n<details>\n<summary>Mermaid diagram source (click to expand)</summary>\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n</details>\n`;
                } else {
                    console.log('Falling back to mermaid markup only');
                    // Fall back to just mermaid markup if PNG generation fails
                    diagramContent = `\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`;
                }
                
                const newContent = readmeContent.slice(0, position) + diagramContent + readmeContent.slice(position);
                
                await fs.promises.writeFile(readmePath, newContent, 'utf8');
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error inserting Mermaid diagram:', error);
        return false;
    }
}

export async function generatePngFromMermaid(diagram: string, outputPath: string): Promise<string | null> {
    // Create a timestamp for temporary directories
    const timestamp = Date.now();
    const tempDir = path.join(path.dirname(outputPath), '.temp', `mermaid-${timestamp}`);
    
    try {
        // Create images directory if it doesn't exist
        const imagesDir = path.join(path.dirname(outputPath), 'images');
        if (!fs.existsSync(imagesDir)) {
            await fs.promises.mkdir(imagesDir, { recursive: true });
        }
        
        // Use our dedicated mermaid renderer to generate the PNG
        console.log('Generating PNG image from mermaid diagram...');
        const result = await renderMermaidToPng(diagram, imagesDir);
        
        // Clean up any temporary files that might have been created
        try {
            await cleanupTempFiles(path.dirname(outputPath), timestamp);
        } catch (cleanupError) {
            console.warn('Warning: Failed to clean up temporary files:', cleanupError);
            // Continue even if cleanup fails
        }
        
        return result;
    } catch (error) {
        console.error('Error generating PNG from Mermaid diagram:', error);
        // Attempt cleanup even if generation failed
        try {
            await cleanupTempFiles(path.dirname(outputPath), timestamp);
        } catch (cleanupError) {
            // Ignore cleanup errors
        }
        return null;
    }
}

/**
 * Helper function to clean up temporary files created during diagram generation
 */
async function cleanupTempFiles(basePath: string, timestamp: number): Promise<void> {
    const tempDir = path.join(basePath, '.temp', `mermaid-${timestamp}`);
    if (fs.existsSync(tempDir)) {
        try {
            // Remove all files in the temp directory
            try {
                const files = await fs.promises.readdir(tempDir);
                if (files && Array.isArray(files)) {
                    for (const file of files) {
                        try {
                            await fs.promises.unlink(path.join(tempDir, file));
                        } catch (e) {
                            // Silently continue if a single file fails to delete
                            console.debug(`Could not delete file ${file}: ${e instanceof Error ? e.message : String(e)}`);
                        }
                    }
                }
            } catch (readError) {
                console.warn(`Could not read directory ${tempDir}: ${readError instanceof Error ? readError.message : String(readError)}`);
            }
            
            // Remove the directory itself
            try {
                // Use fs.promises.rm if available (Node.js >= 14.14.0)
                if (typeof fs.promises.rm === 'function') {
                    await fs.promises.rm(tempDir, { recursive: true, force: true });
                } else {
                    await fs.promises.rmdir(tempDir);
                }
            } catch (rmError) {
                console.warn(`Could not remove directory ${tempDir}: ${rmError instanceof Error ? rmError.message : String(rmError)}`);
            }
        } catch (error) {
            console.warn(`Failed to clean up temp directory ${tempDir}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
