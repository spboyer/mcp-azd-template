import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createServer,
  formatValidationSection,
  registerTools,
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

// Mock the azd-tools module following proper error handling patterns
jest.mock('../azd-tools', () => ({
  listTemplates: jest.fn(),
  analyzeTemplate: jest.fn(),
  validateTemplate: jest.fn(),
  createTemplate: jest.fn(),
}));

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
    
    // Each tool should be registered with proper schema validation
    expect(mockServer.tool).toHaveBeenCalledTimes(4);
    expect(mockServer.tool).toHaveBeenCalledWith(
      'list-templates',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    expect(mockServer.tool).toHaveBeenCalledWith(
      'analyze-template',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    expect(mockServer.tool).toHaveBeenCalledWith(
      'validate-template',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
    expect(mockServer.tool).toHaveBeenCalledWith(
      'create-template',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
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