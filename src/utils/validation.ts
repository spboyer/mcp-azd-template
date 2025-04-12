import * as fs from 'fs';
import * as path from 'path';

/**
 * Gets the current workspace directory path
 */
export function getCurrentWorkspace(): string {
    return process.cwd();
}

/**
 * Checks if a file exists at the given path
 */
export async function pathExists(basePath: string, relativePath: string | readonly string[]): Promise<boolean> {
    const paths = Array.isArray(relativePath) ? relativePath : [relativePath];
    const fullPath = path.join(basePath, ...paths[0].split('/'));
    return fs.promises.access(fullPath).then(() => true, () => false);
}

/**
 * Validates README.md content against required sections
 */
export async function validateReadmeContent(content: string): Promise<string[]> {
    const requiredSections = [
        'Features',
        'Getting Started',
        'Prerequisites',
        'Architecture',
        'Security'
    ];

    const issues: string[] = [];
    const contentLower = content.toLowerCase();
    
    // Check for required sections
    for (const section of requiredSections) {
        if (!contentLower.includes(`## ${section.toLowerCase()}`)) {
            issues.push(`Missing required section: ${section}`);
        }
    }

    // Force return of issues even if no other validation is done
    return issues;
}

/**
 * Validates dev container configuration
 */
export async function validateDevContainer(templatePath: string): Promise<string[]> {
    const warnings: string[] = [];
    const devContainerPath = path.join(templatePath, '.devcontainer');
    
    if (!await pathExists(templatePath, '.devcontainer')) {
        warnings.push('Missing .devcontainer directory');
        return warnings;
    }

    const devContainerJsonPath = path.join(devContainerPath, 'devcontainer.json');
    if (!await pathExists(devContainerPath, 'devcontainer.json')) {
        warnings.push('Missing devcontainer.json in .devcontainer directory');
        return warnings;
    }

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
    } catch (error) {
        warnings.push('Invalid devcontainer.json file');
    }

    return warnings;
}

/**
 * Validates GitHub workflow configuration
 */
export async function validateGitHubWorkflows(templatePath: string): Promise<string[]> {
    const warnings: string[] = [];
    const workflowsPath = path.join(templatePath, '.github', 'workflows');
    
    if (!await pathExists(templatePath, '.github/workflows')) {
        warnings.push('Missing .github/workflows directory');
        return warnings;
    }

    try {
        const files = await fs.promises.readdir(workflowsPath);
        
        // Check for validation/test workflow
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
    } catch (error) {
        warnings.push('Error reading workflow files');
    }

    return warnings;
}
