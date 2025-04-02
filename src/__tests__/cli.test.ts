import * as indexModule from '../index.js';

// Mock the main function from index.ts
jest.mock('../index.js', () => ({
  main: jest.fn().mockImplementation(() => Promise.resolve()),
}));

// Store the original require.main
const originalRequireMain = require.main;

describe('CLI Module', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Mock console.error to capture output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.exit with correct parameter types
    jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exit with code: ${code}`);
    }) as unknown as jest.Mock;
  });

  afterEach(() => {
    // Restore mocks
    (console.error as jest.Mock).mockRestore();
    jest.spyOn(process, 'exit').mockRestore();
  });

  test('CLI should call main function when executed directly', async () => {
    // Set up the module to simulate being run directly
    Object.defineProperty(require, 'main', {
      value: module,
    });

    // Import the module which should trigger the main function call
    await import('../cli.js');
    
    // Verify main was called
    expect(indexModule.main).toHaveBeenCalled();
  });

  test('CLI should handle errors from main function', async () => {
    // Mock main to throw an error
    (indexModule.main as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
    
    // Set up the module to simulate being run directly
    Object.defineProperty(require, 'main', {
      value: module,
    });
    
    // Import the module which should trigger the error handler
    try {
      await import('../cli.js');
    } catch (error) {
      // Expected error from process.exit
    }
    
    // Verify error was logged and process.exit was called
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Fatal error in CLI:'));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});