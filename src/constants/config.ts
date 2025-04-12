// Required files and sections based on official azd template requirements
export const REQUIRED_FILES = [
    'README.md',
    'LICENSE',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    ['azure.yaml', 'azure-dev.yaml'],
    'infra',
    '.devcontainer',
    '.github/workflows'
] as const;

// Constants for gallery API
export const AI_GALLERY_API_URL = 'https://azuremarketplaceapi.azure.com/api/v1/';
export const AI_GALLERY_SEARCH_ENDPOINT = 'templates/search';

export const REQUIRED_README_SECTIONS = [
    'Features',
    'Getting Started',
    'Prerequisites',
    'Installation',
    'Architecture Diagram',
    'Region Availability',
    'Costs',
    'Security',
    'Resources'
] as const;

export const REQUIRED_SECURITY_NOTICE = `This template, the application code and configuration it contains, has been built to showcase Microsoft Azure specific services and tools. We strongly advise our customers not to make this code part of their production environments without implementing or enabling additional security features.`;
