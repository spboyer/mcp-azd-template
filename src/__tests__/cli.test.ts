import * as indexModule from '../index';

// Mock the main function from index.ts
jest.mock('../index', () => ({
  main: jest.fn().mockImplementation(() => Promise.resolve()),
}));

describe('CLI Module', () => {
  // Store original properties and state before tests
  const originalRequireMain = require.main;
  const originalProcessExit = process.exit;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Mock console.error to capture output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.exit with correct parameter types
    process.exit = jest.fn((code?: string | number | null | undefined) => {
      throw new Error(`Process exit with code: ${code}`);
    }) as any;
  });

  afterEach(() => {
    // Restore mocks and original properties
    (console.error as jest.Mock).mockRestore();
    process.exit = originalProcessExit;
  });

  test('CLI should call main function when executed directly', async () => {
    // Create a mock module object that mimics the CLI module
    const mockModule = { exports: {} };
    
    // Set a global flag to simulate this module being executed directly
    (global as any).__cliIsMain = true;
    
    // Load the CLI module with the proper context
    jest.isolateModules(() => {
      const cli = require('../cli');
    });
    
    // Verify main was called
    expect(indexModule.main).toHaveBeenCalled();
    
    // Clean up
    delete (global as any).__cliIsMain;
  });

  test('CLI should handle errors from main function', async () => {
    // Mock main to throw an error
    (indexModule.main as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
    
    // Set a global flag to simulate this module being executed directly
    (global as any).__cliIsMain = true;
    
    // Load the CLI module with the proper context which should trigger the error handler
    try {
      jest.isolateModules(() => {
        const cli = require('../cli');
      });
    } catch (error) {
      // Expected error from process.exit
    }
    
    // Verify error was logged and process.exit was called
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Fatal error in CLI:'));
    expect(process.exit).toHaveBeenCalledWith(1);
    
    // Clean up
    delete (global as any).__cliIsMain;
  });
});