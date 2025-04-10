import * as fs from 'fs';
import * as path from 'path';
import { REQUIRED_README_SECTIONS, REQUIRED_SECURITY_NOTICE } from '../constants/config';
import { ReadmeValidationResult } from '../types';

export async function pathExists(basePath: string, pathToCheck: string): Promise<boolean> {
    try {
        const items = await fs.promises.readdir(path.dirname(path.join(basePath, pathToCheck)));
        return items.some(item => item.toLowerCase() === path.basename(pathToCheck).toLowerCase());
    } catch {
        return false;
    }
}

export async function validateReadmeContent(readmePath: string): Promise<ReadmeValidationResult> {
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
        if (!content.includes('architecture') || 
            (!content.includes('.png') && 
             !content.includes('.drawio') && 
             !content.includes('```mermaid'))) {
            warnings.push('Architecture diagram section should include a diagram image or Mermaid diagram');
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

        // Check specifically for Mermaid diagram
        const hasMermaidDiagram = content.includes('```mermaid') || content.includes('~~~mermaid');

        return {
            missingSections,
            missingBadges,
            missingSecurityNotice: !hasSecurityNotice,
            warnings,
            hasMermaidDiagram
        };
    } catch (error) {
        throw new Error(`Failed to validate README: ${error}`);
    }
}

/**
 * Gets the current workspace path
 * @returns The path to the current workspace
 */
export function getCurrentWorkspace(): string {
    // Return the current working directory or a configured workspace path
    return process.cwd();
}
