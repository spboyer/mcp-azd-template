import { z } from 'zod';

// Azure.yaml schema validation
export const azureWorkflowStepSchema = z.object({
    type: z.string().optional(),
    handler: z.string().optional(),
    args: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    env: z.record(z.string(), z.string()).optional()
});

export const azureServiceSchema = z.object({
    project: z.string().optional(),
    language: z.string().optional(),
    host: z.string().optional(),
    docker: z.boolean().optional(),
    path: z.string().optional()
});

export const azureYamlSchema = z.object({
    name: z.string().min(2),
    resourceGroup: z.string().min(3).max(64).optional(),
    metadata: z.object({
        template: z.string().optional()
    }).optional(),
    infra: z.object({
        provider: z.enum(['bicep', 'terraform']).optional(),
        path: z.string().optional(),
        module: z.string().optional()
    }).optional(),
    services: z.record(z.string(), azureServiceSchema).optional(),
    workflows: z.record(z.string(), 
        z.union([
            z.object({
                steps: z.array(azureWorkflowStepSchema).min(1)
            }),
            z.array(azureWorkflowStepSchema)
        ])
    ).optional()
});

// Tool schemas
export const validateAzureYamlSchema = z.object({
    filePath: z.string().optional().describe('Path to the azure.yaml file to validate. If not provided, looks for azure.yaml in current directory'),
});

export const listTemplatesSchema = z.object({});

export const searchTemplatesSchema = z.object({
    query: z.string().describe('The query to search for templates with')
});

export const searchAiGallerySchema = z.object({
    query: z.string().describe('The query to search for templates in the AI gallery')
});

export const analyzeTemplateSchema = z.object({
    templatePath: z.string().describe('Path to the azd template directory')
});

export const validateTemplateSchema = z.object({
    templatePath: z.string().describe('Path to the azd template directory')
});
