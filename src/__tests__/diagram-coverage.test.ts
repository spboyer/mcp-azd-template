import * as fs from 'fs';
import * as path from 'path';
import { 
    checkForMermaidDiagram, 
    createDefaultMermaidDiagram
} from '../services/diagram-generation';

// Mock fs
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn()
    }
}));

describe('Diagram Generation Coverage Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    it('createDefaultMermaidDiagram should return a proper diagram', () => {
        const diagram = createDefaultMermaidDiagram();
        expect(diagram).toContain('graph TD');
        expect(diagram).toContain('User[👤 User]');
        expect(diagram).toContain('FrontEnd[🌐 Frontend]');
    });
    
    it('checkForMermaidDiagram should detect mermaid diagrams', async () => {
        (fs.promises.readFile as jest.Mock).mockResolvedValue('```mermaid\ngraph TD\n```');
        const result = await checkForMermaidDiagram('readme.md');
        expect(result).toBe(true);
    });
    
    it('checkForMermaidDiagram should return false when no diagram exists', async () => {
        (fs.promises.readFile as jest.Mock).mockResolvedValue('# No diagram here');
        const result = await checkForMermaidDiagram('readme.md');
        expect(result).toBe(false);
    });
    
    it('checkForMermaidDiagram should handle file read errors', async () => {
        (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
        const result = await checkForMermaidDiagram('non-existent.md');
        expect(result).toBe(false);
    });
});
