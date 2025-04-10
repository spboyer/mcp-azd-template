/**
 * Template structures definitions
 */
import { 
    createAzureYaml, 
    createReadme, 
    createDevContainerConfig, 
    createValidationWorkflow, 
    createBicepTemplate, 
    createBicepParams, 
    createContributing, 
    createLicense, 
    createSecurity, 
    createCodeOfConduct
} from './file-generators';

/**
 * Type definition for file content generator functions
 */
export type FileContentGenerator = (name: string, language: string, architecture: string) => string;

/**
 * Template structure configurations by architecture type
 */
export const templateStructures = {
    web: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows'],
        files: {
            'azure.yaml': createAzureYaml,
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    },
    api: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows', 'tests'],
        files: {
            'azure.yaml': createAzureYaml,
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    },
    function: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows', 'tests'],
        files: {
            'azure.yaml': createAzureYaml,
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    },
    container: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows', 'tests'],
        files: {
            'azure.yaml': createAzureYaml,
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    },
    other: {
        dirs: ['infra', 'src', '.devcontainer', '.github/workflows'],
        files: {
            'azure.yaml': createAzureYaml,
            'README.md': createReadme,
            '.devcontainer/devcontainer.json': createDevContainerConfig,
            '.github/workflows/validate.yml': createValidationWorkflow,
            'infra/main.bicep': createBicepTemplate,
            'infra/main.parameters.json': createBicepParams,
            'CONTRIBUTING.md': createContributing,
            'LICENSE': createLicense,
            'SECURITY.md': createSecurity,
            'CODE_OF_CONDUCT.md': createCodeOfConduct
        }
    }
} as const;
