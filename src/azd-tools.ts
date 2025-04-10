/**
 * Azure Developer CLI (azd) template tools
 * Main entry point that re-exports all functionality from the modular structure.
 */

// Re-export all core services
export * from './services/template-search';
export * from './services/template-analysis';
export * from './services/template-validation';
export * from './services/diagram-generation';
export * from './services/template-creation';

// Re-export schemas, types and utilities
export * from './schemas/validation';
// Re-export only non-conflicting types
export type {
    TemplateSearchResult,
    TemplateCreateParams,
    TemplateCreateResult,
    ResourceDefinition
} from './types';
export * from './utils/validation';

// Re-export constants for external use
export {
    REQUIRED_FILES,
    REQUIRED_README_SECTIONS,
    REQUIRED_SECURITY_NOTICE,
    AI_GALLERY_API_URL,
    AI_GALLERY_SEARCH_ENDPOINT
} from './constants/config';