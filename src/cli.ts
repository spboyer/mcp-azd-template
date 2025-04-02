#!/usr/bin/env node

import { main } from './index';

// Export a function to run the CLI for testing purposes
export async function runCli(): Promise<void> {
    try {
        await main();
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