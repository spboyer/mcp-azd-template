#!/usr/bin/env node

import { main } from './index';
import { runValidationAction } from './index';

// Process command line arguments
const processArgs = (): { command: string; args: string[] } => {
    const args = process.argv.slice(2);
    const command = args[0] || 'server';
    return { command, args: args.slice(1) };
};

// Export a function to run the CLI for testing purposes
export async function runCli(): Promise<void> {
    try {
        const { command, args } = processArgs();
        
        switch (command) {
            case 'validate-action':
                // GitHub Actions mode - validate template and exit with appropriate code
                const templatePath = args[0];
                const result = await runValidationAction(templatePath);
                process.exit(result ? 0 : 1);
                break;
            case 'server':
            default:
                // Run as MCP server (default)
                await main();
                break;
        }
    } catch (error) {
        console.error('Fatal error in CLI:', error);
        process.exit(1);
    }
}

// Check if this module is being run directly or imported during testing
// Using require.main === module for normal execution
// or a global flag for testing
const isMainModule = require.main === module || (global as any).__cliIsMain;

if (isMainModule) {
    runCli();
}