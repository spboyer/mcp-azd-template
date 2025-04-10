// filepath: c:\github\mcp\mcp-azd-template\src\__tests__\fixed-azd-tools.fixed.ts
import * as fs from 'fs';
import { Dirent } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as child_process from 'child_process';
import { 
  listTemplates,
  analyzeTemplate,
  validateTemplate,
  createTemplate,
  searchTemplates,
  generateMermaidFromBicep,
  TemplateAnalysisResult,
  TemplateValidationResult
} from '../azd-tools';

// Mock dependencies
jest.mock('fs');
jest.mock('child_process', () => ({
  exec: jest.fn()
}));
jest.mock('../utils/validation', () => ({
  pathExists: jest.fn(),
  validateReadmeContent: jest.fn()
}));

// Create a mock Dirent class for file system operations
class MockDirent implements Dirent {
  name: string;
  isDirectory(): boolean { return false; }
  isFile(): boolean { return true; }
  isBlockDevice(): boolean { return false; }
  isCharacterDevice(): boolean { return false; }
  isSymbolicLink(): boolean { return false; }
  isFIFO(): boolean { return false; }
  isSocket(): boolean { return false; }

  constructor(name: string, isDir: boolean = false) {
    this.name = name;
    this.isDirectory = () => isDir;
    this.isFile = () => !isDir;
  }
}

// Helper function to assert successful template analysis
function assertSuccessfulAnalysis(result: TemplateAnalysisResult | { error: string }): asserts result is TemplateAnalysisResult {
  if ('error' in result) {
    fail('Expected successful result but got error: ' + result.error);
  }
}

// Helper function to assert error in template analysis
function assertAnalysisError(result: TemplateAnalysisResult | { error: string }): asserts result is { error: string } {
  if (!('error' in result)) {
    fail('Expected error result but got success');
  }
}

// Helper function to assert successful validation
function assertSuccessfulValidation(result: TemplateValidationResult | { error: string }): asserts result is TemplateValidationResult {
  if ('error' in result) {
    fail('Expected successful validation but got error: ' + result.error);
  }
}

// Helper function to assert error in validation
function assertValidationError(result: TemplateValidationResult | { error: string }): asserts result is { error: string } {
  if (!('error' in result)) {
    fail('Expected error result but got success');
  }
}

// Helper function to assert successful diagram generation
function assertSuccessfulDiagram(result: { diagram: string } | { error: string }): asserts result is { diagram: string } {
  if ('error' in result) {
    fail('Expected successful diagram but got error: ' + result.error);
  }
}

// Helper function to assert error in diagram generation
function assertDiagramError(result: { diagram: string } | { error: string }): asserts result is { error: string } {
  if (!('error' in result)) {
    fail('Expected error result but got success');
  }
}

describe('Azure Developer CLI Tools', () => {
  describe('listTemplates', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });    
    
    test('should return template list on success', async () => {
      // Mock exec to return sample output
      const exec = child_process.exec as jest.MockedFunction<typeof child_process.exec>;
      exec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, Buffer.from('Template1\nTemplate2\nTemplate3'), '');
        }
        return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } } as any;
      });

      const result = await listTemplates();
      expect(result).toHaveProperty('templates');
      expect(result.templates).toContain('Template1');
      expect(result.templates).toContain('Template2');
      expect(result.templates).toContain('Template3');
    });

    test('should return error on failure', async () => {
      // Mock exec to return error
      const exec = child_process.exec as jest.MockedFunction<typeof child_process.exec>;
      exec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(new Error('Command failed'), Buffer.from(''), '');
        }
        return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } } as any;
      });

      const result = await listTemplates();
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Error listing templates');
    });
  });

  describe('searchTemplates', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    test('should return matching templates on success', async () => {
      // Mock exec to return sample output
      const exec = child_process.exec as jest.MockedFunction<typeof child_process.exec>;
      exec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, Buffer.from('node-api\npython-web'), '');
        }
        return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } } as any;
      });

      const result = await searchTemplates('api');
      expect(result).toHaveProperty('templates');
      expect(result.templates).toContain('node-api');
    });

    test('should return no results message when no matches', async () => {
      // Mock exec to return sample output
      const exec = child_process.exec as jest.MockedFunction<typeof child_process.exec>;
      exec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, Buffer.from(''), '');
        }
        return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } } as any;
      });

      const result = await searchTemplates('nonexistent');
      expect(result).toHaveProperty('templates');
      expect(result.templates).toContain('No templates found matching');
    });

    test('should return error on failure', async () => {
      // Mock exec to return error
      const exec = child_process.exec as jest.MockedFunction<typeof child_process.exec>;
      exec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(new Error('Command failed'), Buffer.from(''), '');
        }
        return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } } as any;
      });

      const result = await searchTemplates('query');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Error searching templates');
    });
  });

  describe('analyzeTemplate', () => {
    beforeEach(() => {
      // Reset all mocks
      jest.resetAllMocks();

      // Mock fs functions
      const mockFs = fs as jest.Mocked<typeof fs>;
      mockFs.existsSync.mockImplementation(path => true);
      mockFs.readFileSync.mockImplementation(() => 'name: test-template');
      
      // Mock path exists
      const validation = require('../utils/validation');
      validation.pathExists.mockResolvedValue(true);
    });

    test('should analyze template with valid structure', async () => {
      // Mock filesystem to return structure with infra and app code
      const mockFs = fs as jest.Mocked<typeof fs>;
      mockFs.readdirSync.mockImplementation((path) => {
        if (path.toString().includes('infra')) {
          return [new MockDirent('main.bicep'), new MockDirent('parameters.json')] as unknown as Dirent[];
        } else if (path.toString().includes('src')) {
          return [new MockDirent('app.js'), new MockDirent('index.html')] as unknown as Dirent[];
        }
        return [new MockDirent('infra', true), new MockDirent('src', true), new MockDirent('azure.yaml')] as unknown as Dirent[];
      });

      const result = await analyzeTemplate('/test/path');
      assertSuccessfulAnalysis(result);
      
      expect(result.hasInfra).toBe(true);
      expect(result.hasApp).toBe(true);
      expect(result.configFile).toBe('name: test-template');
    });

    test('should return recommendations for missing components', async () => {
      // Mock filesystem to return structure without infra
      const mockFs = fs as jest.Mocked<typeof fs>;
      mockFs.readdirSync.mockImplementation((path) => {
        if (path.toString().includes('src')) {
          return [new MockDirent('app.js'), new MockDirent('index.html')] as unknown as Dirent[];
        }
        return [new MockDirent('src', true), new MockDirent('azure.yaml')] as unknown as Dirent[];
      });

      const result = await analyzeTemplate('/test/path');
      assertSuccessfulAnalysis(result);
      
      expect(result.hasInfra).toBe(false);
      expect(result.recommendations).toContain(expect.stringContaining('infra'));
    });

    test('should handle missing azure.yaml', async () => {
      // Mock fs.existsSync to return false for azure.yaml
      const mockFs = fs as jest.Mocked<typeof fs>;
      mockFs.existsSync.mockImplementation(path => !path.toString().includes('azure.yaml'));

      const result = await analyzeTemplate('/test/path');
      assertAnalysisError(result);
      
      expect(result.error).toContain('missing azure.yaml');
    });

    test('should handle directory not found', async () => {
      // Mock pathExists to return false
      const validation = require('../utils/validation');
      validation.pathExists.mockResolvedValue(false);

      const result = await analyzeTemplate('/test/path');
      assertAnalysisError(result);
      
      expect(result.error).toContain('Template directory not found');
    });
  });

  describe('validateTemplate', () => {
    beforeEach(() => {
      // Reset all mocks
      jest.resetAllMocks();

      // Mock basic fs functions
      const mockFs = fs as jest.Mocked<typeof fs>;
      mockFs.existsSync.mockImplementation(() => true);
      mockFs.readFileSync.mockImplementation(() => 'name: test-template\nservices:\n  web:\n    language: typescript\n    host: appservice');
      
      // Mock fs promises
      const mockFsPromises = mockFs.promises as jest.Mocked<typeof fs.promises>;
      mockFsPromises.readFile.mockResolvedValue(`
        # Test Template
        
        ## Features
        
        ## Getting Started
        
        ## Prerequisites
        
        ## Installation
        
        ## Architecture Diagram
        
        ## Resources
      `);
      mockFsPromises.readdir.mockResolvedValue([
        new MockDirent('main.bicep'),
        new MockDirent('parameters.json')
      ] as unknown as Dirent[]);
      
      // Mock validation utils
      const validation = require('../utils/validation');
      validation.pathExists.mockResolvedValue(true);
      validation.validateReadmeContent.mockReturnValue([]);
    });

    test('should validate template with no issues', async () => {
      // Mock child_process.exec to check for azd CLI
      const exec = child_process.exec as jest.MockedFunction<typeof child_process.exec>;
      exec.mockImplementation((command, options, callback) => {
        if (callback) {
          callback(null, Buffer.from('Azure Developer CLI version 1.0.0'), '');
        }
        return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } } as any;
      });

      const result = await validateTemplate('/test/path');
      assertSuccessfulValidation(result);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.length).toBe(0);
    });

    test('should handle directory not found', async () => {
      // Mock pathExists to return false
      const validation = require('../utils/validation');
      validation.pathExists.mockResolvedValue(false);

      const result = await validateTemplate('/test/path');
      assertValidationError(result);
      
      expect(result.error).toContain('Template directory not found');
    });

    test('should check README content', async () => {
      // Set validateReadmeContent to return issues
      const validation = require('../utils/validation');
      validation.validateReadmeContent.mockReturnValue([
        'Missing required section: Features',
        'Missing required section: Prerequisites'
      ]);

      const result = await validateTemplate('/test/path');
      assertSuccessfulValidation(result);
      
      expect(result.readmeIssues.length).toBeGreaterThan(0);
    });
  });

  describe('generateMermaidFromBicep', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('should generate diagram from Bicep files', async () => {
      // Mock fs functions to find and read Bicep files
      const mockFs = fs as jest.Mocked<typeof fs>;
      const mockFsPromises = mockFs.promises as jest.Mocked<typeof fs.promises>;
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(`
        resource webApp 'Microsoft.Web/sites@2021-01-15' = {
          name: 'mywebapp'
          properties: {
            serverFarmId: appServicePlan.id
          }
        }
        
        resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
          name: 'myvault'
        }
        
        resource appServicePlan 'Microsoft.Web/serverfarms@2021-01-15' = {
          name: 'myplan'
        }
      `);
      
      const result = await generateMermaidFromBicep('/test/path');
      assertSuccessfulDiagram(result);
      
      expect(result.diagram).toContain('graph TD');
      expect(result.diagram).toContain('webApp');
      expect(result.diagram).toContain('keyVault');
      expect(result.diagram).toContain('appServicePlan');
    });

    test('should handle errors', async () => {
      // Mock fs functions to simulate error
      const mockFs = fs as jest.Mocked<typeof fs>;
      mockFs.existsSync.mockReturnValue(false);
      
      const result = await generateMermaidFromBicep('/test/path');
      assertDiagramError(result);
      
      expect(result.error).toBeDefined();
    });
  });
});
