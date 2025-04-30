#!/usr/bin/env node

/**
 * Script to test the diagram generation functions directly
 */

const fs = require('fs');
const path = require('path');

// Import TS files directly using ts-node
const { renderMermaidToPng } = require('../src/services/mermaid-renderer');
const { 
  createDefaultMermaidDiagram,
  generatePngFromMermaid
} = require('../src/services/diagram-generation');

// Ensure test output directory exists
const rootDir = path.resolve(__dirname, '..');
const testOutputDir = path.join(rootDir, 'test-output');
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true });
}

async function runTests() {
  console.log('Starting direct mermaid renderer tests...');

  try {
    // Test 1: createDefaultMermaidDiagram
    console.log('Test 1: createDefaultMermaidDiagram');
    const defaultDiagram = createDefaultMermaidDiagram();
    console.log('Default diagram generated:', defaultDiagram.substring(0, 30) + '...');
    
    // Write the default diagram to a file for inspection
    const defaultDiagramPath = path.join(testOutputDir, 'default-diagram.mmd');
    fs.writeFileSync(defaultDiagramPath, defaultDiagram, 'utf8');
    console.log('Default diagram written to:', defaultDiagramPath);

    // Test 2: renderMermaidToPng
    console.log('\nTest 2: renderMermaidToPng');
    const simpleDiagram = 'graph TD\n  A[Start] --> B[End]';
    const pngFileName = await renderMermaidToPng(simpleDiagram, testOutputDir);
    console.log('PNG file generated:', pngFileName);

    // Test 3: generatePngFromMermaid
    console.log('\nTest 3: generatePngFromMermaid');
    const readmePath = path.join(rootDir, 'README.md');
    const complexDiagram = 'graph TD\n  A[Complex] --> B[Test]\n  B --> C[Diagram]';
    const pngFileFromGenerate = await generatePngFromMermaid(complexDiagram, readmePath);
    console.log('PNG file from generatePngFromMermaid:', pngFileFromGenerate);

    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
