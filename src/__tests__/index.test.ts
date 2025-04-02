import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createServer,
  formatValidationSection,
  registerTools,
  main
} from '../index';

// Mock the McpServer class following MCP server implementation practices
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  const mockTool = jest.fn();
  const mockServer = {
    tool: mockTool,
    connect: jest.fn().mockResolvedValue(undefined),
  };
  return {
    McpServer: jest.fn(() => mockServer),
  };
});

// Mock the StdioServerTransport
jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  return {
    StdioServerTransport: jest.fn().mockImplementation(() => ({
      // Mock methods as needed
    })),
  };
});

// Mock the azd-tools module with more comprehensive mock implementations
jest.mock('../azd-tools', () => ({
  listTemplates: jest.fn().mockImplementation(async () => {
    return { templates: 'template1\ntemplate2\ntemplate3' };
  }),
  analyzeTemplate: jest.fn().mockImplementation(async (path) => {
    if (!path) {
      return { 
        hasInfra: true, 
        hasApp: true, 
        configFile: 'name: test', 
        recommendations: ['Add more documentation']
      };
    }
    return { error: 'Invalid path' };
  }),
  validateTemplate: jest.fn().mockImplementation(async (path) => {
    if (!path) {
      return { 
        hasAzureYaml: true,
        hasReadme: true,
        errors: [],
        warnings: ['Consider adding more logs'],
        securityChecks: [],
        infraChecks: [],
        readmeIssues: [],
        devContainerChecks: [],
        workflowChecks: []
      };
    }
    return { error: 'Invalid path' };
  }),
  createTemplate: jest.fn().mockImplementation(async (params) => {
    if (params.name && params.language && params.architecture) {
      return { success: true, message: 'Template created successfully' };
    }
    return { success: false, message: 'Invalid parameters' };
  }),
}));

// Mock console error to keep test output clean
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllMocks();
  (console.error as jest.Mock).mockRestore();
});

describe('MCP Server Creation', () => {
  test('createServer creates an MCP server with correct configuration', () => {
    const server = createServer();
    
    expect(McpServer).toHaveBeenCalledWith({
      name: "azd-template-helper",
      version: expect.any(String),
      capabilities: {
        resources: {},
        tools: {},
      },
    });
  });
  
  test('registerTools registers all tools on the server', () => {
    const mockServer = new McpServer({
      name: 'test',
      version: '1.0.0',
      capabilities: { resources: {}, tools: {} },
    });
    
    registerTools(mockServer);
    
    // There are four distinct tools that should be registered
    const expectedTools = ['list-templates', 'analyze-template', 'validate-template', 'create-template'];
    
    // Verify each tool was registered
    expectedTools.forEach(toolName => {
      expect(mockServer.tool).toHaveBeenCalledWith(
        toolName,
        expect.any(String),
        expect.any(Object),
        expect.any(Function)
      );
    });
    
    // Verify tool was called exactly once for each expected tool
    expect(mockServer.tool).toHaveBeenCalledTimes(expectedTools.length);
  });

  test('main should create server, connect transport and return server', async () => {
    const result = await main();
    
    expect(McpServer).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(console.error).toHaveBeenCalledWith("AZD Template Helper MCP Server running on stdio");
  });
});

describe('Tool Handlers', () => {
  let mockServer: any;
  let toolHandlers: { [key: string]: Function };
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockServer = new McpServer({
      name: 'test',
      version: '1.0.0',
      capabilities: { resources: {}, tools: {} },
    });
    
    // Call registerTools to capture the tool handlers
    registerTools(mockServer);
    
    // Extract the handlers from the mock calls
    toolHandlers = {};
    (mockServer.tool as jest.Mock).mock.calls.forEach((call) => {
      const [name, _desc, _schema, handler] = call;
      toolHandlers[name] = handler;
    });
  });
  
  test('list-templates handler should return templates list', async () => {
    const handler = toolHandlers['list-templates'];
    const result = await handler();
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'template1\ntemplate2\ntemplate3'
        }
      ]
    });
  });
  
  test('analyze-template handler should analyze successfully with valid path', async () => {
    const handler = toolHandlers['analyze-template'];
    const result = await handler({});
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Template Analysis Results')
        }
      ]
    });
    expect(result.content[0].text).toContain('Infrastructure: ✓ Present');
    expect(result.content[0].text).toContain('Application Code: ✓ Present');
    expect(result.content[0].text).toContain('Recommendations');
  });
  
  test('analyze-template handler should handle errors', async () => {
    const handler = toolHandlers['analyze-template'];
    const result = await handler({ templatePath: 'invalid/path' });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Invalid path'
        }
      ]
    });
  });
  
  test('validate-template handler should validate successfully with valid path', async () => {
    const handler = toolHandlers['validate-template'];
    const result = await handler({});
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Template Validation Report')
        }
      ]
    });
    expect(result.content[0].text).toContain('Overall Status');
  });
  
  test('validate-template handler should handle errors', async () => {
    const handler = toolHandlers['validate-template'];
    const result = await handler({ templatePath: 'invalid/path' });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Invalid path'
        }
      ]
    });
  });
  
  test('create-template handler should create template with valid parameters', async () => {
    const handler = toolHandlers['create-template'];
    const result = await handler({ 
      name: 'test-template', 
      language: 'typescript', 
      architecture: 'web' 
    });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Template Created Successfully')
        }
      ]
    });
  });
  
  test('create-template handler should handle errors', async () => {
    const handler = toolHandlers['create-template'];
    const result = await handler({ 
      name: '', // Invalid name
      language: 'typescript', 
      architecture: 'web' 
    });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Invalid parameters'
        }
      ]
    });
  });
});

describe('Helper Functions', () => {
  test('formatValidationSection formats sections correctly', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const title = 'Test Section';
    const icon = '•';
    
    const result = formatValidationSection(title, items, icon);
    
    expect(result).toBe('\n### Test Section\n• Item 1\n• Item 2\n• Item 3');
  });
  
  test('formatValidationSection returns empty string for empty items', () => {
    const result = formatValidationSection('Empty Section', []);
    
    expect(result).toBe('');
  });
});