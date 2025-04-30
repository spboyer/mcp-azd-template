#!/usr/bin/env node

/**
 * Script to validate our fixes to the mermaid renderer and diagram generation functions
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Ensure we're in the correct directory
const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);

// Use async IIFE to allow await
(async function() {
  console.log('Starting validation of fixes...');

  // Run the build first
  try {
    await runCommand('npm run build');
    console.log('✅ Build successful');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }

  // Validate the mermaid-renderer imports in diagram-generation
  try {
    const diagramGenCode = fs.readFileSync(path.join(rootDir, 'src/services/diagram-generation.ts'), 'utf8');
    console.log('Checking imports in diagram-generation.ts...');
    const importPattern = /import\s*{[\s\w,]*renderMermaidToPng[\s\w,]*}\s*from\s*'\.\/mermaid-renderer'/;
    if (importPattern.test(diagramGenCode)) {
      console.log('✅ Import for renderMermaidToPng found in diagram-generation.ts');
    } else {
      console.error('❌ Import for renderMermaidToPng NOT found in diagram-generation.ts');
    }
  } catch (error) {
    console.error('❌ Error checking diagram-generation.ts:', error);
  }

  // Check the structure of the mermaid-renderer function
  try {
    const rendererCode = fs.readFileSync(path.join(rootDir, 'src/services/mermaid-renderer.ts'), 'utf8');
    console.log('Checking mermaid-renderer.ts structure...');
    
    // Check for correct try-catch structure
    const tryCatchPattern = /try\s*{[\s\S]*}\s*catch\s*\([\s\w:]+\)\s*{[\s\S]*}/;
    if (tryCatchPattern.test(rendererCode)) {
      console.log('✅ Basic try-catch structure found in mermaid-renderer.ts');
    } else {
      console.error('❌ Proper try-catch structure NOT found in mermaid-renderer.ts');
    }

    // Check for expected function signature
    const functionSignature = /export\s+async\s+function\s+renderMermaidToPng\s*\(\s*mermaidContent\s*:\s*string\s*,\s*outputDirectory\s*:\s*string\s*\)/;
    if (functionSignature.test(rendererCode)) {
      console.log('✅ Function signature for renderMermaidToPng looks correct');
    } else {
      console.error('❌ Function signature for renderMermaidToPng does not match expected pattern');
    }

    // Check for nested try-catch for error handling
    const nestedTryCatch = /try\s*{[\s\S]*?try\s*{[\s\S]*?}\s*catch\s*\([\s\w:]+\)\s*{[\s\S]*?}/;
    if (nestedTryCatch.test(rendererCode)) {
      console.log('✅ Nested try-catch structure found for error handling');
    } else {
      console.log('⚠️ No nested try-catch structure found, but might be refactored');
    }
  } catch (error) {
    console.error('❌ Error checking mermaid-renderer.ts:', error);
  }
  // Test running basic functionality
  try {
    // Create test directory if it doesn't exist
    const testDir = path.join(rootDir, 'test-output');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Import the modules directly from TypeScript for better debug info
    console.log('Importing modules directly for testing...');
    
    console.log('Executing ts-node to run TypeScript files directly...');
    try {
      await runCommand('npx ts-node scripts/test-diagram-functions.js');
      console.log('✅ Direct TS execution succeeded');
    } catch (tsError) {
      console.error('❌ Direct TS execution failed:', tsError);
    }

    // Import the compiled modules
    try {
      console.log('Importing compiled modules...');
      const mermaidModule = require('../dist/services/mermaid-renderer');
      console.log('✅ Successfully imported mermaid-renderer');
      
      const diagramModule = require('../dist/services/diagram-generation');
      console.log('✅ Successfully imported diagram-generation');
      
      // Try generating a mermaid diagram
      console.log('Testing mermaid diagram generation...');
      const testDiagram = 'graph TD\n  A[Test] --> B[Output]';
      console.log('Calling renderMermaidToPng with diagram:', testDiagram.substring(0, 20) + '...');
      const outputFileName = await mermaidModule.renderMermaidToPng(testDiagram, testDir);
      console.log('renderMermaidToPng returned:', outputFileName);
    } catch (importError) {
      console.error('❌ Error importing or using modules:', importError);
    }
    
    if (outputFileName && typeof outputFileName === 'string') {
      console.log(`✅ Successfully generated diagram: ${outputFileName}`);
      
      // Check if the file was actually created
      const outputPath = path.join(testDir, outputFileName);
      if (fs.existsSync(outputPath)) {
        console.log('✅ Output file exists on disk');
        
        // Check the MMD file too
        const mmdPath = path.join(testDir, `${path.basename(outputFileName, '.png')}.mmd`);
        if (fs.existsSync(mmdPath)) {
          console.log('✅ MMD file also generated correctly');
        } else {
          console.warn('⚠️ MMD file not found, may have encountered an error');
        }
      } else {
        console.error('❌ Output file does not exist on disk!');
      }
    } else {
      console.error('❌ Failed to generate diagram, output is null or invalid');
    }

  } catch (error) {
    console.error('❌ Error during runtime validation:', error);
  }

  console.log('Validation complete.');
})();

// Helper function to run commands
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`${error.message}\n${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
}
