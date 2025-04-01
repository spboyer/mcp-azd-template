#!/usr/bin/env node

import { createServer } from './index';

/**
 * Simple test script that creates an MCP server instance
 * Run this with `node dist/test.js` after building to verify the package works
 */
async function test() {
  try {
    console.log('Creating MCP server instance...');
    const server = createServer();
    console.log('MCP server created successfully!');
    console.log('MCP server is ready for use');
    console.log('Test completed successfully.');
    return 0;
  } catch (error) {
    console.error('Error testing MCP server:', error);
    return 1;
  }
}

if (require.main === module) {
  test().then(exitCode => process.exit(exitCode));
}