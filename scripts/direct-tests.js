#!/usr/bin/env node

/**
 * Direct test runner to verify if our fixes work
 */

const mermaid = require('../dist/services/mermaid-renderer');
const diagram = require('../dist/services/diagram-generation');
const fs = require('fs');
const path = require('path');

async function verifyMermaidRenderer() {
  console.log('Testing mermaid-renderer.ts');
  
  try {
    // First verify basic function structure
    if (typeof mermaid.renderMermaidToPng !== 'function') {
      console.error('❌ renderMermaidToPng is not a function');
      return false;
    }
    console.log('✅ renderMermaidToPng is properly exported as a function');

    // Verify it takes the right parameters
    const testDiagram = 'graph TD\n  A --> B';
    const testOutputDir = path.join(__dirname, '../test-output');
    
    // Ensure output directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
    
    console.log('Calling renderMermaidToPng...');
    const result = await mermaid.renderMermaidToPng(testDiagram, testOutputDir);
    
    if (typeof result !== 'string') {
      console.error(`❌ renderMermaidToPng returned ${result} instead of a string`);
      return false;
    }
    console.log(`✅ renderMermaidToPng returned: ${result}`);
    
    // Check the output file exists
    const outputPath = path.join(testOutputDir, result);
    if (!fs.existsSync(outputPath)) {
      console.error(`❌ Output file ${outputPath} not found`);
      return false;
    }
    console.log(`✅ Output file ${outputPath} was created`);
    
    // Check for MMD file
    const mmdPath = path.join(testOutputDir, `${path.basename(result, '.png')}.mmd`);
    if (!fs.existsSync(mmdPath)) {
      console.error(`❌ MMD file ${mmdPath} not found`);
      return false;
    }
    console.log(`✅ MMD file ${mmdPath} was created`);
    
    // Read MMD file to verify content
    const mmdContent = fs.readFileSync(mmdPath, 'utf8');
    if (mmdContent !== testDiagram) {
      console.error(`❌ MMD content doesn't match input. Expected "${testDiagram}" but got "${mmdContent}"`);
      return false;
    }
    console.log('✅ MMD content matches input diagram');
    
    return true;
  } catch (error) {
    console.error('Error in verifyMermaidRenderer:', error);
    return false;
  }
}

async function verifyDiagramGeneration() {
  console.log('\nTesting diagram-generation.ts');
  
  try {
    // Verify basic functions
    if (typeof diagram.createDefaultMermaidDiagram !== 'function') {
      console.error('❌ createDefaultMermaidDiagram is not a function');
      return false;
    }
    console.log('✅ createDefaultMermaidDiagram is properly exported as a function');
    
    if (typeof diagram.generatePngFromMermaid !== 'function') {
      console.error('❌ generatePngFromMermaid is not a function');
      return false;
    }
    console.log('✅ generatePngFromMermaid is properly exported as a function');
    
    // Test createDefaultMermaidDiagram
    const defaultDiagram = diagram.createDefaultMermaidDiagram();
    if (!defaultDiagram || typeof defaultDiagram !== 'string') {
      console.error('❌ createDefaultMermaidDiagram did not return a string');
      return false;
    }
    console.log('✅ createDefaultMermaidDiagram returned diagram string');
    
    // Test generatePngFromMermaid
    const testOutputDir = path.join(__dirname, '../test-output');
    const simpleDiagram = 'graph TD\n  A[Simple] --> B[Test]';
    
    console.log('Calling generatePngFromMermaid...');
    const result = await diagram.generatePngFromMermaid(simpleDiagram, testOutputDir);
    
    if (!result) {
      console.error('❌ generatePngFromMermaid returned null or undefined');
      return false;
    }
    console.log(`✅ generatePngFromMermaid returned: ${result}`);
    
    return true;
  } catch (error) {
    console.error('Error in verifyDiagramGeneration:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting direct tests...\n');
  
  const mermaidResult = await verifyMermaidRenderer();
  const diagramResult = await verifyDiagramGeneration();
  
  console.log('\nTest summary:');
  console.log(`Mermaid Renderer Tests: ${mermaidResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Diagram Generation Tests: ${diagramResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (mermaidResult && diagramResult) {
    console.log('\n🎉 All tests passed! The fixes appear to be working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. The fixes may need more work.');
  }
}

// Run all the tests
runAllTests();
