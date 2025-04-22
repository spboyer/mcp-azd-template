export interface TemplateHandlerParams {
    templatePath?: string;
}

export interface CreateTemplateParams {
    name: string;
    language: 'typescript' | 'python' | 'java' | 'dotnet' | 'other';
    architecture: 'web' | 'api' | 'function' | 'container' | 'other';
    outputPath: string;
}

export interface ValidateAzureYamlParams {
    filePath?: string;
}
