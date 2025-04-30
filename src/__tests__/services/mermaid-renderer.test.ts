import * as fs from 'fs';
import * as path from 'path';
import { renderMermaidToPng } from '../../services/mermaid-renderer';

// Mock fs
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn()
  },
  existsSync: jest.fn(),
  copyFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

describe('Mermaid Renderer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a directory if it does not exist', async () => {
    // Setup
    const mockDiagram = 'graph TD\n    A --> B';
    const mockOutputDir = 'path/to/images';
    const mockTimestamp = 12345;
    
    // Mock Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
    
    // Mock fs.existsSync to return false for both the directory and existing PNG
    (fs.existsSync as jest.Mock).mockImplementation(() => false);
    
    // Execute
    const result = await renderMermaidToPng(mockDiagram, mockOutputDir);
    
    // Verify
    expect(fs.promises.mkdir).toHaveBeenCalledWith(mockOutputDir, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // Once for PNG, once for MMD
    expect(result).toBe(`architecture-diagram-${mockTimestamp}.png`);
    
    // Restore
    (Date.now as jest.MockedFunction<any>).mockRestore();
  });
  it('should copy existing diagram.png if available', async () => {
    // Setup
    const mockDiagram = 'graph TD\n    A --> B';
    const mockOutputDir = 'path/to/images';
    const mockTimestamp = 12345;
    const existingPngPath = path.join(mockOutputDir, 'diagram.png');
    const expectedOutputPath = path.join(mockOutputDir, `architecture-diagram-${mockTimestamp}.png`);
    
    // Mock Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
    
    // Mock fs.existsSync for the directory and existing PNG
    (fs.existsSync as jest.Mock).mockImplementation(path => {
      return path === existingPngPath || true;
    });
    
    // Execute
    const result = await renderMermaidToPng(mockDiagram, mockOutputDir);
    
    // Verify
    expect(fs.copyFileSync).toHaveBeenCalledWith(existingPngPath, expectedOutputPath);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1); // Only should write the MMD file
    expect(result).toBe(`architecture-diagram-${mockTimestamp}.png`);
    
    // Restore
    (Date.now as jest.MockedFunction<any>).mockRestore();
  });

  it('should handle copy errors and create a minimal PNG instead', async () => {
    // Setup
    const mockDiagram = 'graph TD\n    A --> B';
    const mockOutputDir = 'path/to/images';
    const mockTimestamp = 12345;
    const expectedOutputPath = path.join(mockOutputDir, `architecture-diagram-${mockTimestamp}.png`);
    
    // Mock Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
    
    // Mock fs.existsSync to return true for existing PNG
    (fs.existsSync as jest.Mock).mockImplementation(path => 
      path.includes('diagram.png') ? true : true
    );
    
    // Mock copyFileSync to throw an error
    (fs.copyFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Copy failed');
    });
    
    // Mock console.warn to capture warnings
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Execute
    const result = await renderMermaidToPng(mockDiagram, mockOutputDir);
    
    // Verify
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to copy existing diagram'));
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // PNG and MMD files
    expect(result).toBe(`architecture-diagram-${mockTimestamp}.png`);
    
    // Restore
    (Date.now as jest.MockedFunction<any>).mockRestore();
    warnSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    // Setup
    const mockDiagram = 'graph TD\n    A --> B';
    const mockOutputDir = 'path/to/images';
    
    // Mock fs.existsSync to throw an error
    (fs.existsSync as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Mock console.error to capture errors
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Execute
    const result = await renderMermaidToPng(mockDiagram, mockOutputDir);
      // Verify
    expect(errorSpy).toHaveBeenCalledWith('Error creating placeholder PNG:', expect.any(Error));
    expect(result).toBeNull();
    
    // Restore
    errorSpy.mockRestore();
  });
});
