import { createDefaultMermaidDiagram, checkForMermaidDiagram } from '../services/diagram-generation';
import * as fs from 'fs';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  }
}));

describe('Diagram Generation Module', () => {
  test('createDefaultMermaidDiagram should return expected diagram', () => {
    const diagram = createDefaultMermaidDiagram();
    expect(diagram).toContain('graph TD');
    expect(diagram).toContain('User[👤 User]');
    expect(diagram).toContain('FrontEnd[🌐 Frontend]');
    expect(diagram).toContain('API[🔌 API Service]');
  });

  test('checkForMermaidDiagram should return true when mermaid diagram exists', async () => {
    (fs.promises.readFile as jest.Mock).mockResolvedValue('```mermaid\ngraph TD\n```');
    const result = await checkForMermaidDiagram('path/to/readme.md');
    expect(result).toBe(true);
  });

  test('checkForMermaidDiagram should return false when mermaid diagram does not exist', async () => {
    (fs.promises.readFile as jest.Mock).mockResolvedValue('No diagram here');
    const result = await checkForMermaidDiagram('path/to/readme.md');
    expect(result).toBe(false);
  });
});
