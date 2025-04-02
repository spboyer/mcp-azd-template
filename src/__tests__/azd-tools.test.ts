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
  parse: jest.fn().mockReturnValue({}),
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

  test('should handle generic errors during execution', async () => {
    (execSync as jest.Mock).mockImplementation(() => {
      throw new Error('Some other error');
    });

    const result = await listTemplates();
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('Failed to list templates');
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

  test('should handle file read errors gracefully', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File read error');
    });
    
    const result = await getTemplateInfo('/test/path');
    expect(result).toBeNull();
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
    // Use type assertion for TypeScript's type checking
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Invalid template directory or missing azure.yaml file');
    }
  });

  test('should analyze template structure correctly', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(['infra/main.bicep', 'src/index.ts']);
    
    const result = await analyzeTemplate('/test/path');
    
    // Use type assertion for TypeScript's type checking
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.hasInfra).toBe(true);
      expect(result.hasApp).toBe(true);
      expect(result.configFile).toBe('name: test-template');
      expect(Array.isArray(result.recommendations)).toBe(true);
    }
  });

  test('should generate recommendations when template lacks infra', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(['src/index.ts']);
    
    const result = await analyzeTemplate('/test/path');
    
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.hasInfra).toBe(false);
      expect(result.hasApp).toBe(true);
      expect(result.recommendations).toContain(expect.stringContaining('infra'));
    }
  });

  test('should generate recommendations when template lacks app code', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(['infra/main.bicep']);
    
    const result = await analyzeTemplate('/test/path');
    
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.hasInfra).toBe(true);
      expect(result.hasApp).toBe(false);
      expect(result.recommendations).toContain(expect.stringContaining('application code'));
    }
  });

  test('should handle errors during analysis', async () => {
    (fs.readdirSync as jest.Mock).mockImplementation(() => {
      throw new Error('Failed to read directory');
    });

    const result = await analyzeTemplate('/test/path');
    // Use type assertion for TypeScript's type checking
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Failed to analyze template');
    }
  });

  test('should use current workspace if no path provided', async () => {
    (fs.readdirSync as jest.Mock).mockReturnValue(['infra/main.bicep', 'src/index.ts']);
    
    await analyzeTemplate();
    
    // Should have used the mocked cwd path
    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('/mock/workspace'));
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
  });

  test('should return error when azd is not installed', async () => {
    (execSync as jest.Mock).mockImplementation(() => {
      throw new Error('command not found');
    });

    const result = await validateTemplate('/test/path');
    
    // Type guard for proper error handling
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Azure Developer CLI (azd) is not installed');
    }
  });

  test('should return error when directory does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    
    const result = await validateTemplate('/test/path');
    
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Template directory does not exist');
    }
  });

  test('should validate template structure with missing files', async () => {
    // Missing some required files
    (fs.existsSync as jest.Mock).mockImplementation((path) => {
      if (path.includes('README.md') || path.includes('azure.yaml')) {
        return true;
      }
      return false;
    });
    
    const result = await validateTemplate('/test/path');
    
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain(expect.stringContaining('Missing required file:'));
    }
  });

  test('should validate template with README issues', async () => {
    // Missing required sections in README
    (fs.promises.readFile as jest.Mock).mockResolvedValue(`
      # Test Template
      
      ## Some Section Not Required
    `);
    
    const result = await validateTemplate('/test/path');
    
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.readmeIssues.length).toBeGreaterThan(0);
    }
  });

  test('should validate template with security notice present', async () => {
    // Include the required security notice
    (fs.promises.readFile as jest.Mock).mockResolvedValue(`
      # Test Template
      
      This template, the application code and configuration it contains, has been built to showcase Microsoft Azure specific services and tools. We strongly advise our customers not to make this code part of their production environments without implementing or enabling additional security features.
      
      ## Features
    `);
    
    const result = await validateTemplate('/test/path');
    
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.securityChecks.length).toBe(0);
    }
  });

  test('should validate template schema with errors', async () => {
    // Invalid schema in yaml file
    (yaml.parse as jest.Mock).mockReturnValue({
      // Missing required 'name' property
      services: { web: { language: 'typescript', host: 'invalid-host' } }
    });

    const result = await validateTemplate('/test/path');
    
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  test('should use current workspace if no path provided', async () => {
    await validateTemplate();
    
    // Should have used the mocked cwd path
    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('/mock/workspace'));
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

  test('should create template with different architectures', async () => {
    const architectures = ['web', 'api', 'function', 'container', 'other'];
    
    for (const architecture of architectures) {
      const params = {
        name: 'test-template',
        language: 'typescript',
        architecture: architecture as any // Type assertion needed for the test
      };
      
      const result = await createTemplate(params);
      expect(result).toHaveProperty('success', true);
    }
    
    // Each architecture should have created directories
    expect(fs.promises.mkdir).toHaveBeenCalledTimes(architectures.length * 3); // 3 is approximate number of dirs per template
  });
  
  test('should create template with different languages', async () => {
    const languages = ['typescript', 'python', 'java', 'dotnet'];
    jest.clearAllMocks();
    
    for (const language of languages) {
      const params = {
        name: 'test-template',
        language: language as any, // Type assertion needed for the test
        architecture: 'web'
      };
      
      await createTemplate(params);
    }
    
    // Should have called writeFile for each language
    expect(fs.promises.writeFile).toHaveBeenCalledTimes(languages.length * 10); // 10 is approximate number of files per template
  });
  
  test('should use current workspace if no output path provided', async () => {
    const params = {
      name: 'test-template',
      language: 'typescript',
      architecture: 'web'
    };
    
    await createTemplate(params);
    
    // Should have created the directory in the mocked cwd
    expect(fs.promises.mkdir).toHaveBeenCalledWith(expect.stringMatching(/\/mock\/workspace\/test-template/), expect.anything());
  });
});