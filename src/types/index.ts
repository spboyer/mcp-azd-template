// Template analysis result types
export interface TemplateAnalysisResult {
    hasInfra: boolean;
    hasApp: boolean;
    configFile: string;
    recommendations: string[];
    diagram?: string; // Adding missing diagram property
}

export interface TemplateValidationResult {
     hasAzureYaml: boolean;
     hasReadme: boolean;
     errors: string[];
     warnings: string[];
     securityChecks: string[];
     infraChecks: string[];
     readmeIssues: string[];
     devContainerChecks: string[];
     workflowChecks: string[];
     diagramAdded?: boolean;
     valid?: boolean; // Adding missing valid property
}

export interface ReadmeValidationResult {
     missingSections: string[];
     missingBadges: string[];
     missingSecurityNotice: boolean;
     warnings: string[];
     hasMermaidDiagram: boolean;
}

export interface TemplateSearchResult {
    templates: string;
    count: number;
    source?: string;
    error?: string;
}

export interface TemplateCreateParams {
    name: string;
    language: string;
    architecture: string;
    outputPath?: string;
}

export interface TemplateCreateResult {
    success: boolean;
    message: string;
}

export interface ResourceDefinition {
    type: string;
    connections: string[];
    properties?: {
        [key: string]: string;
    };
}
