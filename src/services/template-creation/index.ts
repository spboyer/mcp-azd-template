/**
 * Template creation service - main entry point
 */
import * as fs from 'fs';
import * as path from 'path';
import { TemplateCreateParams, TemplateCreateResult } from '../../types';
import { getCurrentWorkspace } from '../../utils/validation';
import { templateStructures, FileContentGenerator } from './template-structures';
import { createLanguageSpecificFiles } from './language-utils';

/**
 * Creates a new AZD template with the specified parameters
 */
export async function createTemplate(params: TemplateCreateParams): Promise<TemplateCreateResult> {
    try {
        const { name, language, architecture } = params;
        const outputPath = params.outputPath || path.join(getCurrentWorkspace(), name);
        const templateConfig = templateStructures[architecture as keyof typeof templateStructures] 
            || templateStructures.web;

        // Create directory structure
        for (const dir of templateConfig.dirs) {
            await fs.promises.mkdir(path.join(outputPath, dir), { recursive: true });
        }

        // Create template files
        for (const [file, getContent] of Object.entries(templateConfig.files)) {
            const filePath = path.join(outputPath, file);
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            const content = (getContent as FileContentGenerator)(name, language, architecture);
            await fs.promises.writeFile(filePath, content);
        }

        // Create language-specific files
        await createLanguageSpecificFiles(outputPath, language, architecture);

        return {
            success: true,
            message: `Template '${name}' created successfully at ${outputPath}`
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to create template: ${error}`
        };
    }
}

// Export everything from the modules
export * from './template-structures';
export * from './file-generators';
export * from './architecture-utils';
export * from './language-utils';
