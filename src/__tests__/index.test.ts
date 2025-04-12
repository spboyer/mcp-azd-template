import { createServer, formatValidationSection, registerTools, main } from '../index';
import { 
  listTemplates, 
  analyzeTemplate, 
  validateTemplate, 
  createTemplate,
  searchTemplates,
  searchAiGallery
} from '../azd-tools';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Mock azd-tools module
jest.mock('../azd-tools', () => ({
  listTemplates: jest.fn().mockResolvedValue({ templates: 'template1\ntemplate2\ntemplate3' }),  searchTemplates: jest.fn().mockImplementation((query) => Promise.resolve({
    templates: 'template1\ntemplate2',
    count: 2
  })),
  searchAiGallery: jest.fn().mockResolvedValue({ 
    templates: 'ai-template1\nai-template2', 
    count: 2,
    source: 'ai-gallery' 
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
  })
}));

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
    StdioServerTransport: jest.fn().mockImplementation(() => ({})),
  };
});

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
      // There are six distinct tools that should be registered
    const expectedTools = [
      'list-templates', 
      'search-templates',
      'search-ai-gallery',
      'analyze-template', 
      'validate-template', 
      'create-template'
    ];
      // Verify tool was called for each expected tool
    expect(mockServer.tool).toHaveBeenCalledTimes(expectedTools.length);
    
    // Get the actual tool names that were registered
    const registeredTools = (mockServer.tool as jest.Mock).mock.calls.map(call => call[0]);
    
    // Verify each expected tool was registered
    expectedTools.forEach(toolName => {
      expect(registeredTools).toContain(toolName);
    });
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
    // Create a mapping from  prefixed names to original test keys
    const toolMapping: { [key: string]: string } = {
      'list-templates': 'list-templates',
      'search-templates': 'search-templates',
      'search-ai-gallery': 'search-ai-gallery',
      'analyze-template': 'analyze-template',
      'validate-template': 'validate-template',
      'create-template': 'create-template'
    };
    
    (mockServer.tool as jest.Mock).mock.calls.forEach((call) => {
      const [name, _desc, _schema, handler] = call;
      // Store under both the new prefixed name and the original name for backward compatibility
      toolHandlers[name] = handler;
      if (toolMapping[name]) {
        toolHandlers[toolMapping[name]] = handler;
      }
    });
  });
    test('search-templates handler should return formatted search results', async () => {
    const handler = toolHandlers['search-templates'];
    const result = await handler({ query: 'template' });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Templates matching \'template\'')
        }
      ]
    });
    expect(result.content[0].text).toContain('Found 2 templates');
    expect(result.content[0].text).toContain('template1');
    expect(result.content[0].text).toContain('template2');
  });

  test('search-templates handler should handle no results', async () => {
    // Override the mock to return zero results for this test
    (searchTemplates as jest.Mock).mockResolvedValueOnce({
      templates: `No templates found matching: 'nonexistent'`,
      count: 0
    });
      const handler = toolHandlers['search-templates'];
    const result = await handler({ query: 'nonexistent' });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('No templates found matching')
        }
      ]
    });
  });

  test('search-templates handler should handle errors', async () => {
    // Override the mock to return an error for this test
    (searchTemplates as jest.Mock).mockResolvedValueOnce({
      error: 'Failed to search templates: Some error occurred'
    });
      const handler = toolHandlers['search-templates'];
    const result = await handler({ query: 'error-trigger' });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Failed to search templates: Some error occurred'
        }
      ]
    });
  });

  test('search-ai-gallery handler should return formatted AI gallery search results', async () => {    const handler = toolHandlers['search-ai-gallery'];
    const result = await handler({ query: 'ai-template' });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('AI Gallery Templates matching \'ai-template\'')
        }
      ]
    });
    expect(result.content[0].text).toContain('Found 2 templates');
    expect(result.content[0].text).toContain('ai-template1');
    expect(result.content[0].text).toContain('ai-template2');
  });

  test('search-ai-gallery handler should handle no results', async () => {
    // Override the mock to return zero results for this test
    (searchAiGallery as jest.Mock).mockResolvedValueOnce({
      templates: `No templates found in AI gallery matching: 'nonexistent'`,
      count: 0,
      source: 'ai-gallery'
    });
      const handler = toolHandlers['search-ai-gallery'];
    const result = await handler({ query: 'nonexistent' });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('No AI gallery templates found matching')
        }
      ]
    });
  });

  test('search-ai-gallery handler should handle errors', async () => {
    // Override the mock to return an error for this test
    (searchAiGallery as jest.Mock).mockResolvedValueOnce({
      error: 'Failed to search AI gallery: API error'
    });
      const handler = toolHandlers['search-ai-gallery'];
    const result = await handler({ query: 'error-trigger' });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Failed to search AI gallery: API error'
        }
      ]
    });
  });
  
  test('list-templates handler should return templates list', async () => {    const handler = toolHandlers['list-templates'];
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

  test('validate-template handler should report when a Mermaid diagram was added', async () => {
    // Override the mock to simulate diagram being added
    (validateTemplate as jest.Mock).mockResolvedValueOnce({
      hasAzureYaml: true,
      hasReadme: true,
      errors: [],
      warnings: [],
      securityChecks: [],
      infraChecks: [],
      readmeIssues: [],
      devContainerChecks: [],
      workflowChecks: [],
      diagramAdded: true // Indicate diagram was added
    });
    
    const handler = toolHandlers['validate-template'];
    const result = await handler({ templatePath: '/valid/path' });
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Automatic Updates Applied')
        }
      ]
    });
    
    // Check for the diagram added message
    expect(result.content[0].text).toContain('Mermaid architecture diagram was generated');
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