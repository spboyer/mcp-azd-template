import * as fs from 'fs';
import * as path from 'path';
import { validateAzureYaml } from '../../services/azure-yaml-validation';

jest.mock('fs', () => ({
    promises: {
        access: jest.fn(),
        readFile: jest.fn()
    }
}));

describe('Azure YAML Validation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should validate a valid azure.yaml file', async () => {
        const validYaml = `
            name: test-template
            services:
              api:
                project: ./src/api
                language: python
                host: containerapp
            metadata:
              template: test-template@0.1.0
        `;

        (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.readFile as jest.Mock).mockResolvedValue(validYaml);

        const result = await validateAzureYaml('/test/azure.yaml');

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
    });

    test('should handle missing file', async () => {
        (fs.promises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

        const result = await validateAzureYaml('/test/azure.yaml');

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('azure.yaml not found');
    });

    test('should handle invalid yaml syntax', async () => {
        const invalidYaml = `
            name: test-template
            services: {
              invalid yaml content
        `;

        (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.readFile as jest.Mock).mockResolvedValue(invalidYaml);

        const result = await validateAzureYaml('/test/azure.yaml');

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Failed to parse azure.yaml');
    });

    test('should handle schema validation failures', async () => {
        const invalidSchema = `
            # Missing required name field
            services:
              api:
                project: ./src/api
        `;

        (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.readFile as jest.Mock).mockResolvedValue(invalidSchema);

        const result = await validateAzureYaml('/test/azure.yaml');

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Required');
    });

    test('should add warnings for missing best practices', async () => {
        const missingBestPractices = `
            name: test-template
            services:
              api:
                project: ./src/api
        `;

        (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.readFile as jest.Mock).mockResolvedValue(missingBestPractices);

        const result = await validateAzureYaml('/test/azure.yaml');

        expect(result.warnings).toContain('Consider adding template metadata for better discoverability');
        expect(result.warnings).toContain('Infrastructure provider not specified');
    });
});
