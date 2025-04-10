/**
 * Template creation service module - re-exports from modular structure
 */

// Re-export everything from template-creation modules
export * from './template-creation/index';
export * from './template-creation/architecture-utils';
export * from './template-creation/bicep-generators';
export * from './template-creation/file-generators';
export * from './template-creation/language-utils';
export * from './template-creation/template-structures';

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getCurrentWorkspace } from '../utils/validation';

/**
 * Creates a new Azure Developer CLI (azd) template
 */
export async function createTemplate(params: {
    name: string;
    language: string;
    architecture: string;
    outputPath?: string;
}): Promise<{ success: boolean; message: string }> {
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
            const content = getContent(name, language, architecture);
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

// Template structure configurations
const templateStructures = {
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

// Template file creation helpers
function createAzureYaml(name: string, language: string, architecture: string): string {
    const config: any = {
        name,
        metadata: {
            template: `${name}@0.0.1-beta`
        },
        infra: {
            provider: 'bicep',
            path: './infra'
        }
    };

    // Add service configuration based on architecture
    if (architecture !== 'other') {
        const serviceConfig = {
            language,
            project: './src',
            host: architecture === 'function' ? 'function' : 
                  architecture === 'container' ? 'containerapp' : 
                  'appservice'
        };

        if (architecture === 'container') {
            Object.assign(serviceConfig, { docker: true });
        }

        config.services = {
            [architecture === 'container' ? 'app' : architecture]: serviceConfig
        };    }

    return yaml.dump(config);
}

function createReadme(name: string, language: string, architecture: string): string {
    return `# ${name}

A ${architecture} template using ${language} and Azure Developer CLI (azd).

## Features

- ${architecture.toUpperCase()} application template
- Infrastructure as Code using Bicep
- CI/CD using GitHub Actions
- Dev Container support

## Prerequisites

- [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
${getLanguagePrereqs(language)}

## Getting Started

1. Initialize the environment:
   \`\`\`bash
   azd init
   \`\`\`

2. Provision infrastructure and deploy:
   \`\`\`bash
   azd up
   \`\`\`

## Architecture Diagram

[Insert your architecture diagram here]

### Components

${getArchitectureComponents(architecture)}

## Project Structure

\`\`\`
.
├── .devcontainer/          # Development container configuration
├── .github/
│   └── workflows/          # GitHub Actions workflows
├── infra/                  # Infrastructure as Code (Bicep)
└── src/                    # Application source code
\`\`\`

## Region Availability

This template can be deployed to any Azure region that supports:
${getRequiredServices(architecture)}

For region availability, see: [Azure region availability](https://azure.microsoft.com/regions/services/)

## Costs

Estimated costs for this template:
${getCostEstimate(architecture)}

Use the [Azure pricing calculator](https://azure.microsoft.com/pricing/calculator/) for a detailed cost analysis.

## Security

This template, the application code and configuration it contains, has been built to showcase Microsoft Azure specific services and tools. We strongly advise our customers not to make this code part of their production environments without implementing or enabling additional security features.

For more information, see [SECURITY.md](SECURITY.md).

## Contributing

This project welcomes contributions and suggestions. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.`;
}

function getArchitectureComponents(architecture: string): string {
    switch (architecture) {
        case 'web':
            return '- Azure App Service for web hosting\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        case 'api':
            return '- Azure App Service for API hosting\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        case 'function':
            return '- Azure Functions for serverless compute\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        case 'container':
            return '- Azure Container Apps for container hosting\n- Azure Container Registry\n- Azure Key Vault for secrets\n- Application Insights for monitoring';
        default:
            return '- Azure Key Vault for secrets\n- Application Insights for monitoring';
    }
}

function getRequiredServices(architecture: string): string {
    const services = ['Key Vault', 'Application Insights'];
    switch (architecture) {
        case 'web':
        case 'api':
            services.unshift('App Service');
            break;
        case 'function':
            services.unshift('Functions');
            break;
        case 'container':
            services.unshift('Container Apps', 'Container Registry');
            break;
    }
    return services.map(s => `- ${s}`).join('\n');
}

function getCostEstimate(architecture: string): string {
    switch (architecture) {
        case 'web':
        case 'api':
            return '- App Service: Basic tier (~$13/month)\n- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
        case 'function':
            return '- Functions: Consumption plan (pay per execution)\n- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
        case 'container':
            return '- Container Apps: Consumption plan (pay per use)\n- Container Registry: Basic tier (~$5/month)\n- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
        default:
            return '- Key Vault: Standard tier (~$0.03/10K operations)\n- Application Insights: Pay as you go';
    }
}

function createDevContainerConfig(name: string, language: string): string {
    return JSON.stringify({
        name: `${name} Development`,
        features: {
            'ghcr.io/devcontainers/features/azure-cli:1': {},
            'ghcr.io/devcontainers/features/github-cli:1': {},
            'ghcr.io/devcontainers/features/docker-in-docker:1': {}
        },
        customizations: {
            vscode: {
                extensions: [
                    'ms-azuretools.azure-dev',
                    'ms-azuretools.vscode-bicep',
                    ...getLanguageExtensions(language)
                ]
            }
        },
        postCreateCommand: 'azd version'
    }, null, 2);
}

function createValidationWorkflow(name: string): string {
    return `name: Validate Template
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Install azd
      uses: Azure/setup-azd@v1
      
    - name: Validate Template
      uses: Azure/dev-community-templates-ci@v1
      with:
        path: .

    - name: Security Scan
      uses: microsoft/security-devops-action@v1
      with:
        categories: 'IaC,secrets'`;
}

function createBicepTemplate(name: string, architecture: string): string {
    // Get the service name based on architecture
    let serviceName: string;
    switch (architecture) {
        case 'web':
            serviceName = 'web';
            break;
        case 'api':
            serviceName = 'api';
            break;
        case 'function':
            serviceName = 'function';
            break;
        case 'container':
            serviceName = 'app';
            break;
        default:
            serviceName = 'app';
    }

    // Create a bicep template with proper AZD tags
    return `param location string = resourceGroup().location
param environmentName string
param resourceToken string = uniqueString(subscription().subscriptionId, resourceGroup().id)
param tags object = {}

// Merge supplied tags with required AZD tags
var defaultTags = {
  'azd-env-name': environmentName
}
var allTags = union(defaultTags, tags)

// Add your Bicep template here based on the ${architecture} architecture
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'plan-\${environmentName}-\${resourceToken}'
  location: location
  tags: allTags
  sku: {
    name: 'B1'
  }
}

${architecture === 'function' ? 
`// Function App with proper azd-service-name tag
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'func-\${environmentName}-\${resourceToken}'
  location: location
  tags: union(allTags, { 'azd-service-name': '${serviceName}' })
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      ftpsState: 'Disabled'
    }
  }
}

output SERVICE_${serviceName.toUpperCase()}_NAME string = functionApp.name
output SERVICE_${serviceName.toUpperCase()}_URI string = 'https://\${functionApp.properties.defaultHostName}'` 
: architecture === 'container' ? 
`// Container App with proper azd-service-name tag
resource containerApp 'Microsoft.App/containerApps@2022-03-01' = {
  name: 'ca-\${environmentName}-\${resourceToken}'
  location: location
  tags: union(allTags, { 'azd-service-name': '${serviceName}' })
  properties: {
    configuration: {
      ingress: {
        external: true
        targetPort: 80
      }
    }
    template: {
      containers: [
        {
          name: '${serviceName}'
          image: '$\{DOCKER_REGISTRY_SERVER_URL}/$\{DOCKER_REGISTRY_SERVER_USERNAME}/${serviceName}:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
    }
  }
}

output SERVICE_${serviceName.toUpperCase()}_NAME string = containerApp.name
output SERVICE_${serviceName.toUpperCase()}_URI string = containerApp.properties.configuration.ingress.fqdn` 
: 
`// App Service with proper azd-service-name tag
resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'app-\${environmentName}-\${resourceToken}'
  location: location
  tags: union(allTags, { 'azd-service-name': '${serviceName}' })
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

output SERVICE_${serviceName.toUpperCase()}_NAME string = webApp.name
output SERVICE_${serviceName.toUpperCase()}_URI string = 'https://\${webApp.properties.defaultHostName}'`}

// Key Vault with tags but not azd-service-name since it's not a deployable service target
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'kv-\${environmentName}-\${resourceToken}'
  location: location
  tags: allTags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
  }
}

// Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-\${environmentName}-\${resourceToken}'
  location: location
  tags: allTags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}`;
}

function createBicepParams(name: string): string {
    return JSON.stringify({
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',
        contentVersion: '1.0.0.0',
        parameters: {
            environmentName: {
                value: '${name}-dev'
            }
        }
    }, null, 2);
}

function createContributing(name: string): string {
    return `# Contributing to ${name}

This project welcomes contributions and suggestions. Most contributions require you to agree to a Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your contribution.

## Code of Conduct

This project has adopted the [Contributor Covenant](CODE_OF_CONDUCT.md). For more information, see the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Process

1. Fork the repository and create your branch from \`main\`.
2. Make your changes
3. Test your changes using \`azd up\`
4. Update documentation if needed
5. Issue that pull request!

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable.
2. Update the example architecture diagram if you changed the infrastructure.
3. You may merge the Pull Request once you have the sign-off of two other developers.`;
}

function createLicense(name: string): string {
    const year = new Date().getFullYear();
    return `MIT License

Copyright (c) ${year} ${name}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
}

function createSecurity(name: string): string {
    return `# Security Policy

## Supported Versions

This template is currently in development. Security updates will be applied to the latest version.

## Reporting a Vulnerability

If you believe you have found a security vulnerability in this template, please report it to us:

1. **Do not** report security vulnerabilities through public GitHub issues.
2. Email your findings to [SECURITY_EMAIL].
3. Include detailed information about the vulnerability.
4. Include steps to reproduce if possible.

You should receive a response within 24 hours. Please allow us to assess and respond to the vulnerability before any public disclosure.

## Security Configuration

This template includes several security best practices:

1. Key Vault for secret management
2. Managed Identities for Azure resources
3. Network security rules
4. HTTPS/TLS configuration

## Security Notices

This template, the application code and configuration it contains, has been built to showcase Microsoft Azure specific services and tools. We strongly advise our customers not to make this code part of their production environments without implementing or enabling additional security features.`;
}

function createCodeOfConduct(name: string): string {
    return `# Code of Conduct

## Our Pledge

In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone.

## Our Standards

Examples of behavior that contributes to creating a positive environment include:
* Using welcoming and inclusive language
* Being respectful of differing viewpoints and experiences
* Gracefully accepting constructive criticism
* Focusing on what is best for the community

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project team. All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances.`;
}

async function createLanguageSpecificFiles(outputPath: string, language: string, architecture: string): Promise<void> {
    const srcPath = path.join(outputPath, 'src');
    
    switch (language) {
        case 'typescript':
            await fs.promises.writeFile(
                path.join(srcPath, 'package.json'),
                JSON.stringify({
                    name: path.basename(outputPath),
                    version: '0.0.1',
                    private: true,
                    scripts: {
                        start: 'node dist/index.js',
                        build: 'tsc',
                        dev: 'ts-node src/index.ts'
                    }
                }, null, 2)
            );
            await fs.promises.writeFile(
                path.join(srcPath, 'tsconfig.json'),
                JSON.stringify({
                    compilerOptions: {
                        target: 'es2020',
                        module: 'commonjs',
                        outDir: './dist',
                        rootDir: './src',
                        strict: true,
                        esModuleInterop: true,
                        skipLibCheck: true,
                        forceConsistentCasingInFileNames: true
                    }
                }, null, 2)
            );
            break;
        case 'python':
            await fs.promises.writeFile(
                path.join(srcPath, 'requirements.txt'),
                'fastapi\nuvicorn\npython-dotenv\n'
            );
            break;
        case 'java':
            // Add Java-specific files
            break;
        case 'dotnet':
            // Add .NET-specific files
            break;
    }
}

function getLanguagePrereqs(language: string): string {
    switch (language) {
        case 'typescript':
            return '- Node.js 16 or later\n- npm or yarn';
        case 'python':
            return '- Python 3.8 or later\n- pip';
        case 'java':
            return '- Java 17 or later\n- Maven or Gradle';
        case 'dotnet':
            return '- .NET 6.0 or later';
        default:
            return '';
    }
}

function getLanguageExtensions(language: string): string[] {
    switch (language) {
        case 'typescript':
            return [
                'dbaeumer.vscode-eslint',
                'esbenp.prettier-vscode'
            ];
        case 'python':
            return [
                'ms-python.python',
                'ms-python.vscode-pylance'
            ];
        case 'java':
            return [
                'vscjava.vscode-java-pack',
                'redhat.vscode-xml'
            ];
        case 'dotnet':
            return [
                'ms-dotnettools.csharp',
                'ms-dotnettools.vscode-dotnet-runtime'
            ];
        default:
            return [];
    }
}
