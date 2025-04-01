import { z } from 'zod';
export declare function getTemplateInfo(templatePath: string): Promise<string | null>;
export declare const listTemplatesSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const analyzeTemplateSchema: z.ZodObject<{
    templatePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    templatePath: string;
}, {
    templatePath: string;
}>;
export declare const validateTemplateSchema: z.ZodObject<{
    templatePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    templatePath: string;
}, {
    templatePath: string;
}>;
export declare function listTemplates(): Promise<{
    error: string;
    templates?: undefined;
} | {
    templates: string;
    error?: undefined;
}>;
export declare function analyzeTemplate(templatePath?: string): Promise<{
    hasInfra: boolean;
    hasApp: boolean;
    configFile: string;
    recommendations: string[];
} | {
    error: string;
}>;
export declare function validateTemplate(templatePath?: string): Promise<{
    hasAzureYaml: boolean;
    hasReadme: boolean;
    errors: string[];
    warnings: string[];
    securityChecks: string[];
    infraChecks: string[];
    readmeIssues: string[];
    devContainerChecks: string[];
    workflowChecks: string[];
} | {
    error: string;
}>;
export declare function createTemplate(params: {
    name: string;
    language: string;
    architecture: string;
    outputPath?: string;
}): Promise<{
    success: boolean;
    message: string;
}>;
//# sourceMappingURL=azd-tools.d.ts.map