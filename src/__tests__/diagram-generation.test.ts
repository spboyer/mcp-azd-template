import * as fs from 'fs';
import * as path from 'path';
import { 
    checkForMermaidDiagram, 
    generateMermaidFromBicep,
    generateMermaidDiagram,
    createDefaultMermaidDiagram,
    insertMermaidDiagram,
    generatePngFromMermaid
} from '../services/diagram-generation';
import { renderMermaidToPng } from '../services/mermaid-renderer';

// Mock fs and child_process
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        unlink: jest.fn(),
        rmdir: jest.fn(),
        readdir: jest.fn()
    },
    existsSync: jest.fn(),
    copyFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn()
}));

jest.mock('child_process', () => ({
    execSync: jest.fn()
}));

jest.mock('../utils/validation', () => ({
    pathExists: jest.fn()
}));

describe('Diagram Generation', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('checkForMermaidDiagram', () => {        it('should return true if mermaid diagram exists in README', async () => {
            (fs.promises.readFile as jest.Mock).mockResolvedValue('## Architecture\n\n```mermaid\ngraph TD\n```');
            const result = await checkForMermaidDiagram('path/to/README.md');
            expect(result).toBe(true);
        });
        
        it('should return false if no mermaid diagram in README', async () => {
            (fs.promises.readFile as jest.Mock).mockResolvedValue('## Architecture\n\nNo diagram here');
            const result = await checkForMermaidDiagram('path/to/README.md');
            expect(result).toBe(false);
        });
        
        it('should handle errors when reading files', async () => {
            (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('Cannot read file'));
            const result = await checkForMermaidDiagram('path/to/README.md');
            expect(result).toBe(false);
        });
    });

    describe('createDefaultMermaidDiagram', () => {
        it('should return a default mermaid diagram', () => {
            const diagram = createDefaultMermaidDiagram();
            expect(diagram).toContain('graph TD');
            expect(diagram).toContain('User[👤 User]');
            expect(diagram).toContain('FrontEnd[🌐 Frontend]');
            expect(diagram).toContain('API[🔌 API Service]');
            expect(diagram).toContain('Database[(🗄️ Database)]');
        });
    });

    describe('generateMermaidDiagram', () => {
        it('should generate a mermaid diagram from resource definitions', () => {
            const resources = {
                webApp: {
                    type: 'Microsoft.Web/sites',
                    connections: ['appServicePlan'],
                    properties: {
                        name: 'myWebApp',
                        service: 'web'
                    }
                },
                appServicePlan: {
                    type: 'Microsoft.Web/serverfarms',
                    connections: [],
                    properties: {
                        name: 'myASP'
                    }
                }
            };
            
            const diagram = generateMermaidDiagram(resources);
            
            expect(diagram).toContain('graph TD');
            expect(diagram).toContain('webApp["🌐 myWebApp');
            expect(diagram).toContain('appServicePlan');
            expect(diagram).toContain('webApp --> appServicePlan');
        });
    });

    describe('generateMermaidFromBicep', () => {
        it('should generate a mermaid diagram from a Bicep file', async () => {
            // Setup
            const mockTemplatePath = '/path/to/template';
            const mockBicepContent = `
                resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
                    name: name
                }
                
                resource webApp 'Microsoft.Web/sites@2022-03-01' = {
                    properties: {
                        serverFarmId: appServicePlan.id
                    }
                }
            `;
            
            const pathExistsMock = jest.spyOn(require('../utils/validation'), 'pathExists');
            pathExistsMock.mockResolvedValue(true);
            
            (fs.promises.readFile as jest.Mock).mockResolvedValue(mockBicepContent);
            
            // Execute
            const result = await generateMermaidFromBicep(mockTemplatePath);
              // Verify
            expect(result).toHaveProperty('diagram');
            expect(typeof result.diagram).toBe('string');
            expect(result.diagram).toContain('graph TD');
            
            pathExistsMock.mockRestore();
        });
        
        it('should handle template path that does not exist', async () => {
            const pathExistsMock = jest.spyOn(require('../utils/validation'), 'pathExists');
            pathExistsMock.mockResolvedValue(false);
            
            const result = await generateMermaidFromBicep('/path/to/nonexistent');
            
            expect(result).toHaveProperty('diagram');
            expect(result.diagram).toBe(createDefaultMermaidDiagram());
            
            pathExistsMock.mockRestore();
        });
        
        it('should handle errors when reading Bicep files', async () => {
            const pathExistsMock = jest.spyOn(require('../utils/validation'), 'pathExists');
            pathExistsMock.mockResolvedValue(true);
            
            (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('Cannot read file'));
            
            const result = await generateMermaidFromBicep('/path/with/error');
            
            expect(result).toHaveProperty('diagram');
            expect(result.diagram).toBe(createDefaultMermaidDiagram());
            
            pathExistsMock.mockRestore();
        });
        });
        
        it('should fall back to a default diagram if no Bicep file found', async () => {
            const mockTemplatePath = '/path/to/template';
            
            const pathExistsMock = jest.spyOn(require('../utils/validation'), 'pathExists');
            pathExistsMock.mockResolvedValue(false);
            
            (fs.promises.readdir as jest.Mock).mockResolvedValue([]);
            
            const createDefaultMock = jest.spyOn(require('../services/diagram-generation'), 'createDefaultMermaidDiagram');
            createDefaultMock.mockReturnValue('DEFAULT DIAGRAM');
            
            const result = await generateMermaidFromBicep(mockTemplatePath);
            
            expect(result.diagram).toBe('DEFAULT DIAGRAM');
            expect(createDefaultMock).toHaveBeenCalled();
            
            pathExistsMock.mockRestore();
            createDefaultMock.mockRestore();
        });
    });
    
    describe('generatePngFromMermaid', () => {
        it('should use the mermaid renderer to generate a PNG file', async () => {
            // Setup
            const mockDiagram = 'graph TD\n    A --> B';
            const mockOutputPath = 'path/to/README.md';
            const mockImagesDir = 'path/to/images';
            const mockFileName = 'architecture-diagram-12345.png';
            
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
            
            // Mock implementation of renderMermaidToPng
            const renderMermaidSpy = jest.spyOn(require('../services/mermaid-renderer'), 'renderMermaidToPng')
                .mockResolvedValue(mockFileName);
            
            // Execute
            const result = await generatePngFromMermaid(mockDiagram, mockOutputPath);
            
            // Verify
            expect(fs.existsSync).toHaveBeenCalled();
            expect(fs.promises.mkdir).toHaveBeenCalled();
            expect(renderMermaidSpy).toHaveBeenCalledWith(mockDiagram, expect.any(String));
            expect(result).toBe(mockFileName);
            
            // Restore
            renderMermaidSpy.mockRestore();
        });
        
        it('should handle errors gracefully', async () => {
            // Setup
            const mockDiagram = 'graph TD\n    A --> B';
            const mockOutputPath = 'path/to/README.md';
            
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            (fs.promises.mkdir as jest.Mock).mockRejectedValue(new Error('Test error'));
            
            // Execute
            const result = await generatePngFromMermaid(mockDiagram, mockOutputPath);
            
            // Verify
            expect(result).toBeNull();
        });
        
        it('should clean up temporary files', async () => {
            // Setup
            const mockDiagram = 'graph TD\n    A --> B';
            const mockOutputPath = 'path/to/README.md';
            const mockFileName = 'architecture-diagram-12345.png';
            const mockTimestamp = 12345;
            
            // Mock Date.now()
            jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
            
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.promises.readdir as jest.Mock).mockResolvedValue(['temp.mmd']);
            (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.rmdir as jest.Mock).mockResolvedValue(undefined);
            
            // Mock renderMermaidToPng
            const renderMermaidSpy = jest.spyOn(require('../services/mermaid-renderer'), 'renderMermaidToPng')
                .mockResolvedValue(mockFileName);
            
            // Execute
            const result = await generatePngFromMermaid(mockDiagram, mockOutputPath);
            
            // Verify
            expect(result).toBe(mockFileName);
            
            // Restore
            renderMermaidSpy.mockRestore();
            (Date.now as jest.MockedFunction<any>).mockRestore();
        });
    });
    
    describe('mermaid-renderer', () => {
        it('should create a placeholder PNG when mermaid-cli is not available', async () => {
            // Setup
            const mockDiagram = 'graph TD\n    A --> B';
            const mockOutputDir = 'path/to/images';
            const mockTimestamp = 12345;
            
            // Mock Date.now() to return a predictable timestamp
            jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
              (fs.existsSync as jest.Mock).mockImplementation(path => {
                // Return false for the existing PNG check
                return path.includes('diagram.png') ? false : true;
            });
            
            // Fix the invalid cast assignment
            jest.spyOn(fs, 'writeFileSync').mockImplementation(jest.fn());
            
            // Execute
            const result = await renderMermaidToPng(mockDiagram, mockOutputDir);
            
            // Verify
            expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // Once for PNG, once for mmd
            expect(result).toBe(`architecture-diagram-${mockTimestamp}.png`);
            
            // Restore Date.now mock
            (Date.now as jest.MockedFunction<any>).mockRestore();
        });
          describe('mermaid-renderer additional tests', () => {
            beforeEach(() => {
                // Reset all mocks
                jest.clearAllMocks();
            });
            
            it('should handle error scenarios gracefully', async () => {
                // Setup
                const mockDiagram = 'graph TD\n    A --> B';
                const mockOutputDir = 'path/to/images';
                
                // Mock existsSync to always return false (no existing PNG)
                (fs.existsSync as jest.Mock).mockReturnValue(false);
                
                // Mock fs.promises.mkdir to throw an error
                (fs.promises.mkdir as jest.Mock).mockRejectedValue(new Error('Test error'));
                
                // Spy on console.error to verify error logging
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
                
                // Execute
                const result = await renderMermaidToPng(mockDiagram, mockOutputDir);
                
                // Verify
                expect(consoleSpy).toHaveBeenCalled();
                expect(result).toBeNull();
                
                // Restore
                consoleSpy.mockRestore();
            });
        });
    });
    
    describe('insertMermaidDiagram', () => {
        it('should insert a mermaid diagram with PNG reference when PNG generation is successful', async () => {
            // Setup
            const mockDiagram = 'graph TD\n    A --> B';
            const mockReadmePath = 'path/to/README.md';
            const mockReadmeContent = '# My Project\n\n## Architecture\n\nThis is the architecture section.';
            const mockPngFileName = 'architecture-diagram-12345.png';
            
            (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(mockReadmeContent);
            (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            // Mock checkForMermaidDiagram
            jest.spyOn(require('../services/diagram-generation'), 'checkForMermaidDiagram')
                .mockResolvedValue(false);
                
            // Mock generatePngFromMermaid
            jest.spyOn(require('../services/diagram-generation'), 'generatePngFromMermaid')
                .mockResolvedValue(mockPngFileName);
            
            // Execute
            const result = await insertMermaidDiagram(mockReadmePath, mockDiagram);
            
            // Verify
            expect(result).toBe(true);
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                mockReadmePath,
                expect.stringContaining(`![Architecture Diagram](images/${mockPngFileName})`),
                'utf8'
            );
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                mockReadmePath,
                expect.stringContaining('```mermaid'),
                'utf8'
            );
        });
        
        it('should insert only mermaid code when PNG generation fails', async () => {
            // Setup
            const mockDiagram = 'graph TD\n    A --> B';
            const mockReadmePath = 'path/to/README.md';
            const mockReadmeContent = '# My Project\n\n## Architecture\n\nThis is the architecture section.';
            
            (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(mockReadmeContent);
            (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            // Mock checkForMermaidDiagram
            jest.spyOn(require('../services/diagram-generation'), 'checkForMermaidDiagram')
                .mockResolvedValue(false);
                
            // Mock generatePngFromMermaid to return null (failure)
            jest.spyOn(require('../services/diagram-generation'), 'generatePngFromMermaid')
                .mockResolvedValue(null);
            
            // Execute
            const result = await insertMermaidDiagram(mockReadmePath, mockDiagram);
            
            // Verify
            expect(result).toBe(true);
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                mockReadmePath,
                expect.stringContaining('```mermaid'),
                'utf8'
            );
            expect(fs.promises.writeFile).toHaveBeenCalledWith(
                mockReadmePath,
                expect.not.stringContaining('![Architecture Diagram]'),
                'utf8'
            );
        });
        
        it('should not insert diagram if one already exists', async () => {
            // Setup
            const mockDiagram = 'graph TD\n    A --> B';
            const mockReadmePath = 'path/to/README.md';
            
            // Mock checkForMermaidDiagram
            jest.spyOn(require('../services/diagram-generation'), 'checkForMermaidDiagram')
                .mockResolvedValue(true);
            
            // Execute
            const result = await insertMermaidDiagram(mockReadmePath, mockDiagram);
            
            // Verify
            expect(result).toBe(false);
            expect(fs.promises.writeFile).not.toHaveBeenCalled();
        });
    });
});
