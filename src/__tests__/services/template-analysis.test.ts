import * as fs from 'fs';
import * as path from 'path';
import { validateAzdTags, validateInfra } from '../../services/template-analysis';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    promises: {
        readFile: jest.fn(),
        readdir: jest.fn(),
        access: jest.fn(() => Promise.resolve())
    }
}));

describe('Template Analysis', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Set default mock for fs.promises.access to simulate files existing
        (fs.promises.access as jest.Mock).mockImplementation(() => Promise.resolve());
    });

    describe('validateAzdTags', () => {
        test('should validate service tags in azd.yaml', async () => {
            const yaml = {
                services: {
                    web: { project: './src/web' },
                    api: { project: './src/api' }
                }
            };

            (fs.promises.readFile as jest.Mock).mockResolvedValue(`
                resource webApp 'Microsoft.Web/sites@2022-03-01' = {
                    name: 'web-app'
                    location: location
                }
            `);

            (fs.promises.access as jest.Mock).mockResolvedValue();
            (fs.promises.readdir as jest.Mock).mockResolvedValue(['main.bicep']);

            const warnings = await validateAzdTags('/test/path', yaml);
            expect(warnings).toContainEqual(expect.stringContaining('Missing \'azd-service-name\' tag'));
        });

        test('should pass when all services have tags', async () => {
            const yaml = {
                services: {
                    web: {
                        project: './src/web'
                    }
                }
            };

            // Mock reading Bicep files with correct tags
            (fs.promises.readFile as jest.Mock).mockResolvedValue(`
                resource webApp 'Microsoft.Web/sites@2022-03-01' = {
                    name: 'web-app'
                    location: location
                    tags: {
                        'azd-service-name': 'web'
                    }
                }
            `);

            // Mock infrastructure files exist
            (fs.promises.access as jest.Mock).mockResolvedValue();

            const warnings = await validateAzdTags('/test/path', yaml);
            expect(warnings.length).toBe(0);
        });

        test('should handle invalid Bicep files', async () => {
            const yaml = {
                services: {
                    web: {
                        project: './src/web'
                    }
                }
            };

            // Mock reading invalid Bicep file
            (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));
            
            // Mock infrastructure folder exists
            (fs.promises.access as jest.Mock).mockResolvedValue();

            const warnings = await validateAzdTags('/test/path', yaml);
            expect(warnings).toContainEqual(expect.stringMatching(/Error reading Bicep files/));
        });

        test('should handle missing infrastructure folder', async () => {
            const yaml = {
                services: {
                    web: {
                        project: './src/web'
                    }
                }
            };

            // Mock infrastructure folder doesn't exist
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

            const warnings = await validateAzdTags('/test/path', yaml);
            expect(warnings.length).toBe(0);
        });
    });

    describe('validateInfra', () => {
        test('should validate basic infrastructure requirements', async () => {
            const yaml = {
                services: {
                    web: {
                        project: './src/web',
                        host: 'appservice'
                    }
                }
            };

            // Mock reading Bicep files
            (fs.promises.readFile as jest.Mock).mockResolvedValue(`
                resource webPlan 'Microsoft.Web/serverfarms@2022-03-01' = {
                    name: 'web-plan'
                    location: location
                }

                resource webApp 'Microsoft.Web/sites@2022-03-01' = {
                    name: 'web-app'
                    location: location
                }
            `);

            // Mock infrastructure folder exists
            (fs.promises.access as jest.Mock).mockImplementation((path) => {
                return Promise.resolve();
            });

            const warnings = await validateInfra('/test/path', yaml);
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings).toContainEqual(expect.stringContaining('Consider adding Key Vault'));
        });

        test('should validate container apps requirements', async () => {
            const yaml = {
                services: {
                    api: {
                        project: './src/api',
                        host: 'containerapp'
                    }
                }
            };

            // Mock reading Bicep files without container registry
            (fs.promises.readFile as jest.Mock).mockResolvedValue(`
                resource env 'Microsoft.App/managedEnvironments@2022-03-01' = {
                    name: 'container-env'
                    location: location
                }
            `);

            // Mock infrastructure folder exists
            (fs.promises.access as jest.Mock).mockResolvedValue();

            const warnings = await validateInfra('/test/path', yaml);
            expect(warnings).toContainEqual(expect.stringContaining('Container Apps requires Container Registry'));
        });

        test('should validate function app requirements', async () => {
            const yaml = {
                services: {
                    func: {
                        project: './src/function',
                        host: 'function'
                    }
                }
            };

            // Mock reading Bicep files without storage account
            (fs.promises.readFile as jest.Mock).mockResolvedValue(`
                resource funcApp 'Microsoft.Web/sites@2022-03-01' = {
                    name: 'func-app'
                    kind: 'functionapp'
                    location: location
                }
            `);

            // Mock infrastructure folder exists
            (fs.promises.access as jest.Mock).mockResolvedValue();

            const warnings = await validateInfra('/test/path', yaml);
            expect(warnings).toContainEqual(expect.stringContaining('Function Apps require Storage account'));
        });

        test('should validate monitoring setup', async () => {
            const yaml = {
                services: {
                    web: {
                        project: './src/web',
                        host: 'appservice'
                    }
                }
            };

            // Mock reading Bicep files without App Insights
            (fs.promises.readFile as jest.Mock).mockResolvedValue(`
                resource webApp 'Microsoft.Web/sites@2022-03-01' = {
                    name: 'web-app'
                    location: location
                }
            `);

            // Mock infrastructure folder exists
            (fs.promises.access as jest.Mock).mockResolvedValue();

            const warnings = await validateInfra('/test/path', yaml);
            expect(warnings).toContainEqual(expect.stringContaining('Add Application Insights for monitoring'));
        });

        test('should handle missing infrastructure files', async () => {
            const yaml = {
                services: {
                    web: {
                        project: './src/web'
                    }
                }
            };

            // Mock infrastructure folder doesn't exist
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

            const warnings = await validateInfra('/test/path', yaml);
            expect(warnings).toContainEqual(expect.stringContaining('Missing infrastructure definition'));
        });
    });
});