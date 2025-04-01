#!/usr/bin/env node

import { main } from './index';

// Run the MCP server
main().catch((error) => {
  console.error("Fatal error in CLI:", error);
  process.exit(1);
});