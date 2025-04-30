#!/usr/bin/env node

/**
 * A simple script to test the mermaid renderer directly
 */

const fs = require('fs');
const path = require('path');

// Import the module directly
const { renderMermaidToPng } = require('../dist/services/mermaid-renderer');

// Define test output directory
const testDir = path.join(__dirname, '../test-output');

// Ensure the directory exists
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Define a simple mermaid diagram
const simpleDiagram = `
graph TD
  A[Start] --> B[Process]
  B --> C[End]
  
  style A fill:#f9f,stroke:#333,stroke-width:2px
  style C fill:#bbf,stroke:#333,stroke-width:2px
`;

// Define a more complex mermaid diagram
const complexDiagram = `
graph TD
  User[User] --> FrontEnd[Frontend]
  FrontEnd --> API[API]
  API --> Database[(Database)]
  
  style User fill:#f9f,stroke:#333,stroke-width:2px
  style FrontEnd fill:#bbf,stroke:#333,stroke-width:2px
  style API fill:#bfb,stroke:#333,stroke-width:2px
  style Database fill:#fbb,stroke:#333,stroke-width:2px
`;

// Run the test
async function runTest() {
  console.log('Starting mermaid renderer test...');
  
  try {
    // Test with simple diagram
    console.log('Testing simple diagram...');
    const simpleResult = await renderMermaidToPng(simpleDiagram, testDir);
    console.log(`Simple diagram result: ${simpleResult}`);
    
    if (simpleResult) {
      const simplePath = path.join(testDir, simpleResult);
      console.log(`Simple diagram file exists: ${fs.existsSync(simplePath)}`);
      console.log(`Simple diagram file size: ${fs.statSync(simplePath).size} bytes`);
    }
    
    // Test with complex diagram
    console.log('\nTesting complex diagram...');
    const complexResult = await renderMermaidToPng(complexDiagram, testDir);
    console.log(`Complex diagram result: ${complexResult}`);
    
    if (complexResult) {
      const complexPath = path.join(testDir, complexResult);
      console.log(`Complex diagram file exists: ${fs.existsSync(complexPath)}`);
      console.log(`Complex diagram file size: ${fs.statSync(complexPath).size} bytes`);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

// Run the test
runTest();
