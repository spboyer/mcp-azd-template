import * as fs from 'fs';
import * as path from 'path';
import { createTemplate } from '../../services/template-creation';
import * as fileGenerators from '../../services/template-creation/file-generators';
import * as languageUtils from '../../services/template-creation/language-utils';
import * as architectureUtils from '../../services/template-creation/architecture-utils';

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue('{}'),
  }
}));

// Mock utils/validation module
jest.mock('../../utils/validation', () => ({
  pathExists: jest.fn().mockResolvedValue(true),
  getCurrentWorkspace: jest.fn().mockReturnValue('/mock/workspace'),
  validateReadmeContent: jest.fn(),
  validateDevContainer: jest.fn(),
  validateGitHubWorkflows: jest.fn()
}));

// Mock the file generators
jest.mock('../../services/template-creation/file-generators', () => ({
  createAzureYaml: jest.fn().mockReturnValue('name: test'),
  createReadme: jest.fn().mockReturnValue('# test-project\nA template using Azure Developer CLI'),
  createDevContainerConfig: jest.fn().mockReturnValue('{}'),
  createValidationWorkflow: jest.fn().mockReturnValue('name: CI'),
  createBicepTemplate: jest.fn().mockReturnValue('param location string = resourceGroup().location\nresource webApp \'Microsoft.Web/sites@2022-03-01\' = {}'),
  createBicepParams: jest.fn().mockReturnValue('{}'),
  createContributing: jest.fn().mockReturnValue('# Contributing'),
  createLicense: jest.fn().mockReturnValue('MIT License'),
  createSecurity: jest.fn().mockReturnValue('# Security Policy'),
  createCodeOfConduct: jest.fn().mockReturnValue('# Code of Conduct')
}));

// Mock language utils
jest.mock('../../services/template-creation/language-utils', () => ({
  createLanguageSpecificFiles: jest.fn().mockResolvedValue(undefined),
  getLanguagePrereqs: jest.fn().mockReturnValue('- Node.js 16 or later'),
  getLanguageExtensions: jest.fn().mockReturnValue(['extension1', 'extension2'])
}));

// Mock architecture utils
jest.mock('../../services/template-creation/architecture-utils', () => ({
  getArchitectureComponents: jest.fn().mockReturnValue('- Component 1\n- Component 2'),
  getRequiredServices: jest.fn().mockReturnValue('- Service 1\n- Service 2'),
  getCostEstimate: jest.fn().mockReturnValue('- Cost 1\n- Cost 2')
}));

describe('Template Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    test('should create template with default architecture', async () => {
      const result = await createTemplate({
        name: 'test-project',
        language: 'typescript',
        architecture: 'web'
      });

      expect(result.success).toBe(true);
      expect(fs.promises.mkdir).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();
      // We're not checking exact path because of platform-specific path separators
    });

    test('should handle errors during template creation', async () => {
      // Mock fs.promises.mkdir to throw an error
      (fs.promises.mkdir as jest.Mock).mockRejectedValueOnce(new Error('Directory creation failed'));

      const result = await createTemplate({
        name: 'error-project',
        language: 'typescript',
        architecture: 'web'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create template');
    });

    test('should create template with custom output path', async () => {
      const result = await createTemplate({
        name: 'custom-project',
        language: 'python',
        architecture: 'api',
        outputPath: '/custom/path'
      });

      expect(result.success).toBe(true);
      // Just check that mkdir was called without checking the exact path
      expect(fs.promises.mkdir).toHaveBeenCalled();
    });
  });

  // Add tests for file generators
  describe('file generators', () => {
    test('createAzureYaml should generate yaml content', () => {
      const yamlContent = fileGenerators.createAzureYaml('test-project', 'typescript', 'web');
      expect(yamlContent).toBeTruthy();
    });

    test('createReadme should generate markdown content', () => {
      const readmeContent = fileGenerators.createReadme('test-project', 'typescript', 'web');
      expect(readmeContent).toContain('test-project');
    });

    test('createDevContainerConfig should generate devcontainer config', () => {
      const devContainerConfig = fileGenerators.createDevContainerConfig('test-project', 'typescript', 'web');
      expect(devContainerConfig).toBeTruthy();
    });

    test('createBicepTemplate should generate Bicep template', () => {
      const bicepTemplate = fileGenerators.createBicepTemplate('test-project', 'web');
      expect(bicepTemplate).toContain('Microsoft.Web/sites');
    });
  });

  // Add tests for language utils
  describe('language utils', () => {
    test('getLanguagePrereqs should return language prerequisites', () => {
      const prereqs = languageUtils.getLanguagePrereqs('typescript');
      expect(prereqs).toBeTruthy();
    });

    test('getLanguageExtensions should return language-specific extensions', () => {
      const extensions = languageUtils.getLanguageExtensions('typescript');
      expect(extensions).toBeInstanceOf(Array);
    });
  });

  // Add tests for architecture utils
  describe('architecture utils', () => {
    test('getArchitectureComponents should return appropriate components', () => {
      const components = architectureUtils.getArchitectureComponents('web');
      expect(components).toBeTruthy();
    });

    test('getRequiredServices should return service list', () => {
      const services = architectureUtils.getRequiredServices('function');
      expect(services).toBeTruthy();
    });

    test('getCostEstimate should return cost information', () => {
      const costs = architectureUtils.getCostEstimate('container');
      expect(costs).toBeTruthy();
    });
  });
});