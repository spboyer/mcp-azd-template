/**
 * Simple test script to verify mermaid diagram generation
 */

const path = require('path');
const { renderMermaidToPng } = require('../dist/services/mermaid-renderer');

async function runTest() {
  console.log('Starting test...');
  
  const mermaidDiagram = `graph TD
    A[Client] --> B[API]
    B --> C[Database]`;
  
  console.log('Mermaid diagram content:');
  console.log(mermaidDiagram);
  
  try {
    console.log('Generating PNG...');
    const result = await renderMermaidToPng(mermaidDiagram, './test-output');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

runTest().then(() => console.log('Test completed'));
