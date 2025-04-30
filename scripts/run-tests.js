#!/usr/bin/env node

/**
 * Test runner script to execute Jest tests and capture results
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define the test files to run
const testFiles = [
  'src/__tests__/minimal.test.ts',
  'src/__tests__/services/mermaid-renderer.test.ts'
];

// Function to run a test and capture the output
function runTest(testFile) {
  console.log(`\n\n===== Testing: ${testFile} =====`);
  
  try {
    const output = execSync(`npx jest ${testFile} --no-cache`, { encoding: 'utf8' });
    console.log(output);
    return { success: true, output };
  } catch (error) {
    console.error(`Error running test ${testFile}:`);
    console.error(error.stdout || error.message);
    return { success: false, output: error.stdout || error.message };
  }
}

// Run each test
async function runTests() {
  const results = {};
  
  for (const testFile of testFiles) {
    console.log(`Running test: ${testFile}`);
    results[testFile] = runTest(testFile);
  }
  
  // Write the results to a file
  const resultPath = path.join(__dirname, '../test-output/test-results.json');
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2), 'utf8');
  
  console.log(`\n\nSummary:`);
  for (const [file, result] of Object.entries(results)) {
    console.log(`${file}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  }
  
  console.log(`\nDetailed results written to: ${resultPath}`);
}

runTests();
