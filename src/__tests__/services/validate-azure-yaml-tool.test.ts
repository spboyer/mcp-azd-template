// Mock MCP server before imports
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
    return {
        McpServer: jest.fn().mockImplementation(() => ({
            tool: jest.fn()
        }))
    };
});

// Mock the azure-yaml-validation module
jest.mock('../../services/azure-yaml-validation', () => ({
    validateAzureYaml: jest.fn()
}));

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from '../../index';
import { validateAzureYaml } from '../../services/azure-yaml-validation';

describe('Validate Azure YAML Tool', () => {
    let mockServer: McpServer;    beforeEach(() => {
        jest.clearAllMocks();
        mockServer = new McpServer({
            name: 'test',
            version: '1.0.0',
            capabilities: { resources: {}, tools: {} }
        });

        // Mock successful validation by default
        (validateAzureYaml as jest.Mock).mockResolvedValue({
            isValid: true,
            errors: [],
            warnings: []
        });
    });

    test('should register validate-azure-yaml tool', () => {
        registerTools(mockServer);
        expect(mockServer.tool).toHaveBeenCalledWith(
            'validate-azure-yaml',
            expect.any(String),
            expect.any(Object),
            expect.any(Function)
        );
    });

    test('should handle successful validation', async () => {
        registerTools(mockServer);
        const toolCall = (mockServer.tool as jest.Mock).mock.calls.find(
            call => call[0] === 'validate-azure-yaml'
        );
        const handler = toolCall[3];

        (validateAzureYaml as jest.Mock).mockResolvedValue({
            isValid: true,
            errors: [],
            warnings: ['Consider adding template metadata']
        });

        const result = await handler({ filePath: '/test/azure.yaml' }, {});

        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('✅ azure.yaml is valid');
        expect(result.content[1].text).toContain('Consider adding template metadata');
    });

    test('should handle validation failures', async () => {
        registerTools(mockServer);
        const toolCall = (mockServer.tool as jest.Mock).mock.calls.find(
            call => call[0] === 'validate-azure-yaml'
        );
        const handler = toolCall[3];

        (validateAzureYaml as jest.Mock).mockResolvedValue({
            isValid: false,
            errors: ['Missing required field: name'],
            warnings: []
        });

        const result = await handler({ filePath: '/test/azure.yaml' }, {});

        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('❌ azure.yaml validation failed');
        expect(result.content[1].text).toContain('Missing required field: name');
    });

    test('should handle missing file path', async () => {
        registerTools(mockServer);
        const toolCall = (mockServer.tool as jest.Mock).mock.calls.find(
            call => call[0] === 'validate-azure-yaml'
        );
        const handler = toolCall[3];

        const result = await handler({}, {});

        expect(validateAzureYaml).toHaveBeenCalledWith(undefined);
        expect(result.content[0].type).toBe('text');
    });
});
