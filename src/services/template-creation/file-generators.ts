/**
 * Template file generators
 */
import * as yaml from 'yaml';
import { getArchitectureComponents, getRequiredServices, getCostEstimate } from './architecture-utils';
import { getLanguagePrereqs, getLanguageExtensions } from './language-utils';

/**
 * Creates azure.yaml file content
 */
export function createAzureYaml(name: string, language: string, architecture: string): string {
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
        };
    }

    return yaml.stringify(config);
}

/**
 * Creates README.md file content
 */
export function createReadme(name: string, language: string, architecture: string): string {
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

/**
 * Creates devcontainer configuration file content
 */
export function createDevContainerConfig(name: string, language: string): string {
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

/**
 * Creates GitHub workflow validation file content
 */
export function createValidationWorkflow(name: string): string {
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

/**
 * Creates CONTRIBUTING.md file content
 */
export function createContributing(name: string): string {
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

/**
 * Creates LICENSE file content
 */
export function createLicense(name: string): string {
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

/**
 * Creates SECURITY.md file content
 */
export function createSecurity(name: string): string {
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

/**
 * Creates CODE_OF_CONDUCT.md file content
 */
export function createCodeOfConduct(name: string): string {
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

// Re-export Bicep functions from bicep-generators.ts
export { createBicepTemplate, createBicepParams } from './bicep-generators';
