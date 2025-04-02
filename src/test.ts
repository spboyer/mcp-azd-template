#!/usr/bin/env node

import { createServer } from './index';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

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

// Add Jest test to make this file testable
describe('MCP Server Test Script', () => {
  test('should create and initialize MCP server successfully', async () => {
    // Mock console logs to keep test output clean
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Call the test function
    const result = await test();
    
    // Verify the test succeeded
    expect(result).toBe(0);
    
    // Verify logs were called
    expect(console.log).toHaveBeenCalledWith('Creating MCP server instance...');
    expect(console.log).toHaveBeenCalledWith('MCP server created successfully!');
    expect(console.log).toHaveBeenCalledWith('MCP server is ready for use');
    expect(console.log).toHaveBeenCalledWith('Test completed successfully.');
    
    // Restore console.log
    (console.log as jest.Mock).mockRestore();
  });
});

// Only run the test function when executed directly (not during Jest testing)
if (require.main === module) {
  test().then(exitCode => process.exit(exitCode));
}