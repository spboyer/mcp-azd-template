import * as path from 'path';
import * as fs from 'fs';
import { 
  analyzeTemplate, 
  validateTemplate, 
  listTemplates, 
  createTemplate,
  getTemplateInfo
} from '../azd-tools';
import { execSync } from 'child_process';
import * as yaml from 'yaml';

// Mock child_process and fs modules
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    readdir: jest.fn(),
    writeFile: jest.fn().mockResolvedValue(undefined)
  },
  readdirSync: jest.fn()
}));

// Mock yaml module
jest.mock('yaml', () => ({
  parse: jest.fn(),
  stringify: jest.fn().mockReturnValue('mocked-yaml-content')
}));

// Mock process.cwd()
const originalCwd = process.cwd;
beforeEach(() => {
  jest.resetAllMocks();
  process.cwd = jest.fn().mockReturnValue('/mock/workspace');
});

afterEach(() => {
  process.cwd = originalCwd;
});

describe('listTemplates', () => {
  test('should return error when azd is not installed', async () => {
    (execSync as jest.Mock).mockImplementation(() => {
      throw new Error('command not found');
    });

    const result = await listTemplates();
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('Azure Developer CLI (azd) is not installed');
  });

  test('should return templates when azd is installed', async () => {
    const mockOutput = 'template1\ntemplate2\ntemplate3';
    (execSync as jest.Mock).mockReturnValue(mockOutput);

    const result = await listTemplates();
    expect(result).toHaveProperty('templates');
    expect(result.templates).toBe(mockOutput);
  });
});

describe('getTemplateInfo', () => {
  test('should return null when azure.yaml does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    const result = await getTemplateInfo('/test/path');
    expect(result).toBeNull();
  });

  test('should return content when azure.yaml exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('name: test-template');
    
    const result = await getTemplateInfo('/test/path');
    expect(result).toBe('name: test-template');
  });
});

describe('analyzeTemplate', () => {
  beforeEach(() => {
    // Setup for analyzeTemplate tests
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('name: test-template');
  });

  test('should return error when no azure.yaml found', async () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    
    const result = await analyzeTemplate('/test/path');
    expect(result).toHaveProperty('error');
    expect(result.error).toBe('Invalid template directory or missing azure.yaml file');
  });

  test('should analyze template structure correctly', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(['infra/main.bicep', 'src/index.ts']);
    
    const result = await analyzeTemplate('/test/path');
    
    // Type guard to check if result is an analysis result and not an error
    if (!('error' in result)) {
      expect(result).toHaveProperty('hasInfra', true);
      expect(result).toHaveProperty('hasApp', true);
      expect(result).toHaveProperty('configFile', 'name: test-template');
    } else {
      fail('Expected analysis result but got error');
    }
  });

  test('should handle errors during analysis', async () => {
    (fs.readdirSync as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to read directory');
    });

    const result = await analyzeTemplate('/test/path');
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('Failed to analyze template');
  });
});

describe('validateTemplate', () => {
  beforeEach(() => {
    // Default mocks for validation tests
    (execSync as jest.Mock).mockReturnValue('azd 1.0.0');
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('name: test-template');
    (yaml.parse as jest.Mock).mockReturnValue({
      name: 'test-template',
      services: { web: { language: 'typescript', host: 'appservice' } }
    });
  });

  test('should return error when azd is not installed', async () => {
    (execSync as jest.Mock).mockImplementation(() => {
      throw new Error('command not found');
    });

    const result = await validateTemplate('/test/path');
    
    // Type guard for proper error handling
    if ('error' in result) {
      expect(result.error).toContain('Azure Developer CLI (azd) is not installed');
    } else {
      fail('Expected error result but got validation result');
    }
  });

  test('should return error when directory does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    
    const result = await validateTemplate('/test/path');
    
    if ('error' in result) {
      expect(result.error).toBe('Template directory does not exist');
    } else {
      fail('Expected error result but got validation result');
    }
  });

  test('should validate template structure', async () => {
    (fs.promises.readFile as jest.Mock).mockResolvedValue(`
      # Test Template
      
      ## Features
      ## Getting Started
      ## Prerequisites
      ## Installation
      ## Architecture Diagram
      ## Region Availability
      ## Costs
      ## Security
      ## Resources
    `);
    
    const result = await validateTemplate('/test/path');
    
    if ('error' in result) {
      fail(`Expected validation result but got error: ${result.error}`);
    } else {
      expect(result).toHaveProperty('hasAzureYaml', true);
      expect(result).toHaveProperty('hasReadme', true);
      expect(Array.isArray(result.errors)).toBe(true);
    }
  });
});

describe('createTemplate', () => {
  test('should create template with correct structure', async () => {
    const params = {
      name: 'test-template',
      language: 'typescript',
      architecture: 'web'
    };
    
    const result = await createTemplate(params);
    expect(result).toHaveProperty('success', true);
    expect(fs.promises.mkdir).toHaveBeenCalled();
    expect(fs.promises.writeFile).toHaveBeenCalled();
  });

  test('should handle errors during template creation', async () => {
    (fs.promises.mkdir as jest.Mock).mockRejectedValue(new Error('Failed to create directory'));
    
    const params = {
      name: 'test-template',
      language: 'typescript',
      architecture: 'web'
    };
    
    const result = await createTemplate(params);
    expect(result).toHaveProperty('success', false);
    expect(result.message).toContain('Failed to create template');
  });
});