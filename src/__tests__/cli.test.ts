import * as indexModule from '../index';
import { runCli } from '../cli';

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
    // Call the runCli function directly
    await runCli();
    
    // Verify main was called
    expect(indexModule.main).toHaveBeenCalled();
  });

  test('CLI should handle errors from main function', async () => {
    // Mock main to throw an error
    (indexModule.main as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
    
    // Call the runCli function which should trigger the error handler
    try {
      await runCli();
    } catch (error) {
      // Expected error from process.exit
    }
    
    // Verify error was logged and process.exit was called
    expect(console.error).toHaveBeenCalled();
    expect((console.error as jest.Mock).mock.calls[0][0]).toBe('Fatal error in CLI:');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});