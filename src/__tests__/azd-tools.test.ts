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
  test('should return error when no azure.yaml found', async () => {
    jest.spyOn(global, 'getTemplateInfo' as any).mockResolvedValue(null);
    
    const result = await analyzeTemplate('/test/path');
    expect(result).toHaveProperty('error');
  });

  test('should analyze template structure correctly', async () => {
    jest.spyOn(global, 'getTemplateInfo' as any).mockResolvedValue('name: test');
    (fs.readdirSync as jest.Mock).mockReturnValue(['infra/main.bicep', 'src/index.ts']);
    
    const result = await analyzeTemplate('/test/path');
    expect(result).toHaveProperty('hasInfra', true);
    expect(result).toHaveProperty('hasApp', true);
    expect(result).toHaveProperty('configFile', 'name: test');
  });
});

describe('validateTemplate', () => {
  test('should return error when azd is not installed', async () => {
    (execSync as jest.Mock).mockImplementation(() => {
      throw new Error('command not found');
    });

    const result = await validateTemplate('/test/path');
    
    // Check if result is error type
    if ('error' in result) {
      expect(result.error).toContain('Azure Developer CLI (azd) is not installed');
    } else {
      fail('Expected error result but got validation result');
    }
  });

  test('should return error when directory does not exist', async () => {
    (execSync as jest.Mock).mockReturnValue('azd 1.0.0');
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    const result = await validateTemplate('/test/path');
    
    // Check if result is error type
    if ('error' in result) {
      expect(result.error).toBe('Template directory does not exist');
    } else {
      fail('Expected error result but got validation result');
    }
  });

  test('should validate template structure', async () => {
    (execSync as jest.Mock).mockReturnValue('azd 1.0.0');
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path.includes('azure.yaml') || path.includes('README.md')) {
        return true;
      }
      return false;
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
    
    const result = await validateTemplate('/test/path');
    
    // Check if result is validation result type
    if ('error' in result) {
      fail('Expected validation result but got error');
    } else {
      expect(result).toHaveProperty('hasAzureYaml', true);
      expect(result).toHaveProperty('hasReadme', true);
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