import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { azureYamlSchema } from '../schemas/validation';

export interface AzureYamlValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    parsedContent?: any;
}

export async function validateAzureYaml(filePath?: string): Promise<AzureYamlValidationResult> {
    const result: AzureYamlValidationResult = {
        isValid: false,
        errors: [],
        warnings: []
    };

    // If no path provided, look in current directory
    const yamlPath = filePath || path.join(process.cwd(), 'azure.yaml');

    try {
        // Check if file exists
        await fs.promises.access(yamlPath);
    } catch {
        result.errors.push(`azure.yaml not found at path: ${yamlPath}`);
        return result;
    }

    try {
        // Read and parse YAML
        const content = await fs.promises.readFile(yamlPath, 'utf8');
        const parsedYaml = yaml.parse(content);

        // Validate against schema
        const parseResult = azureYamlSchema.safeParse(parsedYaml);
        
        if (!parseResult.success) {
            result.errors = parseResult.error.errors.map(err => 
                `${err.path.join('.')} ${err.message}`
            );
            return result;
        }

        result.isValid = true;
        result.parsedContent = parseResult.data;

        // Add warnings for best practices
        if (!parsedYaml.metadata?.template) {
            result.warnings.push('Consider adding template metadata for better discoverability');
        }

        if (!parsedYaml.infra?.provider) {
            result.warnings.push('Infrastructure provider not specified');
        }

    } catch (error) {
        result.errors.push(`Failed to parse azure.yaml: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
}
