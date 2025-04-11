import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { execSync } from 'child_process';
import { azureYamlSchema } from '../schemas/validation';
import { pathExists, validateReadmeContent } from '../utils/validation';
import { REQUIRED_FILES } from '../constants/config';
import { checkForMermaidDiagram, generateMermaidFromBicep, insertMermaidDiagram } from './diagram-generation';
import { validateInfra, validateAzdTags } from './template-analysis';
import { validateDevContainer } from '../utils/validation';
import { validateGitHubWorkflows } from '../utils/validation';

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

export interface ReadmeValidationResult {
    errors: string[];
    warnings: string[];
}

export interface TemplateValidationResult {
    errors: string[];
    warnings: string[];
    readmeIssues: string[];
    securityChecks: string[];
    hasAzureYaml: boolean;
    hasReadme: boolean;
    infraChecks: string[];
    devContainerChecks: string[];
    workflowChecks: string[];
    diagramAdded: boolean | false;
}

export type TemplateValidationError = {
    error: string;
};

export type TemplateValidationResponse = TemplateValidationResult | TemplateValidationError;

/**
 * Validates an Azure Developer CLI (azd) template
 * @param templatePath Optional path to the template directory. If not provided, uses current workspace
 * @returns Template validation results or error
 */
export async function validateTemplate(templatePath?: string): Promise<TemplateValidationResponse> {
    const workspacePath = templatePath || getCurrentWorkspace();

    // Initialize result object with all required properties
    const result: TemplateValidationResult = {
        errors: [],
        warnings: [],
        readmeIssues: [],
        securityChecks: [],
        hasAzureYaml: false,
        hasReadme: false,
        infraChecks: [],
        devContainerChecks: [],
        workflowChecks: [],
        diagramAdded: false
    };

    try {
        // Check azd installation first
        if (!checkAzdInstalled()) {
            return { error: 'Azure Developer CLI (azd) is not installed. Please install it first.' };
        }

        // Check if template directory exists
        if (!fs.existsSync(workspacePath)) {
            return { error: 'Template directory does not exist' };
        }

        // Check for README.md
        const readmePath = path.join(workspacePath, 'README.md');
        result.hasReadme = fs.existsSync(readmePath);

        if (!result.hasReadme) {
            return { error: 'Missing README.md file' };
        }

        // Validate README content
        try {
            const readmeContent = await fs.promises.readFile(readmePath, 'utf8');
            result.readmeIssues = await validateReadmeContent(readmeContent);
            
            // Security notice check
            const hasSecurityNotice = readmeContent.toLowerCase().includes('security') && 
                                    readmeContent.toLowerCase().includes('production');
            
            if (!hasSecurityNotice) {
                result.securityChecks.push('README should include security notice for production use');
            }

            // Check and potentially add diagram
            const hasExistingDiagram = await checkForMermaidDiagram(readmePath);
            if (!hasExistingDiagram) {
                const diagramResult = await generateMermaidFromBicep(workspacePath);
                result.diagramAdded = await insertMermaidDiagram(readmePath, diagramResult.diagram);
            }
        } catch (readmeError) {
            result.errors.push(`Failed to validate README: ${readmeError instanceof Error ? readmeError.message : String(readmeError)}`);
        }

        // Check azure.yaml
        const azureYamlPath = path.join(workspacePath, 'azure.yaml');
        result.hasAzureYaml = fs.existsSync(azureYamlPath);

        if (!result.hasAzureYaml) {
            result.errors.push('Missing azure.yaml file');
        } else {
            try {
                const yamlContent = await fs.promises.readFile(azureYamlPath, 'utf8');
                const parsedYaml = yaml.parse(yamlContent);

                // Validate against schema
                const parseResult = azureYamlSchema.safeParse(parsedYaml);
                if (!parseResult.success) {
                    result.errors.push(...parseResult.error.errors.map(e => `azure.yaml: ${e.message}`));
                }

                // Validate infrastructure
                result.infraChecks = await validateInfra(workspacePath, parsedYaml);

                // Validate AZD tags
                const tagWarnings = await validateAzdTags(workspacePath, parsedYaml);
                if (tagWarnings.length > 0) {
                    result.warnings.push(...tagWarnings);
                }
            } catch (yamlError) {
                result.errors.push(`Error parsing azure.yaml: ${yamlError instanceof Error ? yamlError.message : String(yamlError)}`);
            }
        }

        try {
            // Validate dev container configuration
            result.devContainerChecks = await validateDevContainer(workspacePath);

            // Validate GitHub workflows
            result.workflowChecks = await validateGitHubWorkflows(workspacePath);
        } catch (validationError) {
            result.errors.push(`Validation error: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
        }

        // Return error object if there are critical errors
        if (result.errors.length > 0 && result.errors.some(e => e.includes('Failed to validate'))) {
            return { error: `Failed to validate template: ${result.errors.join(', ')}` };
        }

        return result;
    } catch (error) {
        if (error instanceof Error && error.message.includes('EACCES')) {
            return { error: `Failed to validate template: ${error.message}` };
        }
        // For other errors, include them in the result errors array
        return { error: `Failed to validate template: ${error instanceof Error ? error.message : String(error)}` };
    }
}

