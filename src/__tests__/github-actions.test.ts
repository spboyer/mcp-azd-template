import { runValidationAction } from '../index';
import * as templateValidation from '../services/template-validation';
import path from 'path';

// Mock the console for clean test output
const originalConsole = { ...console };
beforeEach(() => {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
});

afterEach(() => {
  global.console = originalConsole;
});

// Mock the validation function
jest.mock('../services/template-validation');

describe('GitHub Actions Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return true for successful validation', async () => {
    // Mock a successful validation result
    const mockValidationResult = {
      errors: [],
      warnings: [],
      readmeIssues: [],
      infraChecks: [],
      securityChecks: [],
      devContainerChecks: [],
      workflowChecks: [],
      diagramAdded: false,
      hasAzureYaml: true,
      hasReadme: true
    };
    
    (templateValidation.validateTemplate as jest.Mock).mockResolvedValue(mockValidationResult);
    
    const result = await runValidationAction('/mock/path');
    
    expect(result).toBe(true);
    expect(templateValidation.validateTemplate).toHaveBeenCalledWith('/mock/path');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('✅ Template validation passed all checks successfully'));
  });

  test('should return false for validation with errors', async () => {
    // Mock a validation result with errors
    const mockValidationResult = {
      errors: ['Critical error 1', 'Critical error 2'],
      warnings: ['Warning 1'],
      readmeIssues: [],
      infraChecks: [],
      securityChecks: [],
      devContainerChecks: [],
      workflowChecks: [],
      diagramAdded: false,
      hasAzureYaml: true,
      hasReadme: true
    };
    
    (templateValidation.validateTemplate as jest.Mock).mockResolvedValue(mockValidationResult);
    
    const result = await runValidationAction('/mock/path');
    
    expect(result).toBe(false);
    expect(templateValidation.validateTemplate).toHaveBeenCalledWith('/mock/path');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ Template validation failed with'));
  });

  test('should return false for validation with only warnings', async () => {
    // Mock a validation result with only warnings
    const mockValidationResult = {
      errors: [],
      warnings: ['Warning 1'],
      readmeIssues: ['README issue 1'],
      infraChecks: ['Infra check 1'],
      securityChecks: [],
      devContainerChecks: [],
      workflowChecks: [],
      diagramAdded: false,
      hasAzureYaml: true,
      hasReadme: true
    };
    
    (templateValidation.validateTemplate as jest.Mock).mockResolvedValue(mockValidationResult);
    
    const result = await runValidationAction('/mock/path');
    
    expect(result).toBe(true); // Should pass because no critical errors
    expect(templateValidation.validateTemplate).toHaveBeenCalledWith('/mock/path');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('❌ Template validation failed with 0 critical issues'));
  });

  test('should return false when validation throws an error', async () => {
    (templateValidation.validateTemplate as jest.Mock).mockRejectedValue(new Error('Validation failed'));
    
    const result = await runValidationAction('/mock/path');
    
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('❌ Validation error: Validation failed'));
  });

  test('should return false when validation returns an error object', async () => {
    (templateValidation.validateTemplate as jest.Mock).mockResolvedValue({ 
      error: 'Template directory does not exist' 
    });
    
    const result = await runValidationAction('/mock/path');
    
    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('❌ Validation failed: Template directory does not exist'));
  });
});
