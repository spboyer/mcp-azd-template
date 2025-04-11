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

/**
 * Validates an Azure Developer CLI (azd) template
 * @param templatePath Optional path to the template directory. If not provided, uses current workspace
 * @returns Template validation results
 */
export async function validateTemplate(templatePath?: string): Promise<TemplateValidationResult> {
    const workspacePath = templatePath || getCurrentWorkspace();    // Initialize result object
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

    // Check azd installation first
    if (!checkAzdInstalled()) {
        result.errors.push('Azure Developer CLI (azd) is not installed. Please install it first.');
        return result;
    }

    // Check if template directory exists
    if (!fs.existsSync(workspacePath)) {
        result.errors.push('Template directory does not exist');
        return result;
    }

    // Validate README first since it's critical
    const readmePath = path.join(workspacePath, 'README.md');
    result.hasReadme = fs.existsSync(readmePath);    if (result.hasReadme) {
        try {
            const readmeContent = await fs.promises.readFile(readmePath, 'utf8');
            const issues = await validateReadmeContent(readmeContent);
            result.readmeIssues = Array.isArray(issues) ? issues : [];
        } catch (err) {
            result.errors.push(`Error reading README.md: ${err}`);
        }
    }

    try {
        
        // Check for required files
        for (const file of REQUIRED_FILES) {
            if (!await pathExists(workspacePath, file)) {
                result.errors.push(`Missing required file: ${file}`);
            }
        }

        // Check azure.yaml
        const azureYamlPath = path.join(workspacePath, 'azure.yaml');
        result.hasAzureYaml = fs.existsSync(azureYamlPath);
        
        if (result.hasAzureYaml) {
            const yamlContent = fs.readFileSync(azureYamlPath, 'utf8');
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
                result.infraChecks.push(...tagWarnings);
            }
        } else {
            result.errors.push('Missing azure.yaml file');
        }        // Handle diagram generation if README exists
        if (result.hasReadme) {
            try {
                const hasExistingDiagram = await checkForMermaidDiagram(readmePath);
                if (!hasExistingDiagram) {
                    const diagramResult = await generateMermaidFromBicep(workspacePath);
                    result.diagramAdded = await insertMermaidDiagram(readmePath, diagramResult.diagram);
                }
            } catch (err) {
                result.warnings.push(`Warning processing README.md diagram: ${err}`);
            }
        }

        // Validate dev container configuration
        result.devContainerChecks = await validateDevContainer(workspacePath);

        // Validate GitHub workflows
        result.workflowChecks = await validateGitHubWorkflows(workspacePath);
        
        return result;
    } catch (error) {
        result.errors.push(`Failed to validate template: ${error}`);
        return result;
    }

}

