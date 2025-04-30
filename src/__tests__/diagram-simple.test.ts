import { createDefaultMermaidDiagram } from '../services/diagram-generation';

describe('Diagram Generation', () => {
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
});
