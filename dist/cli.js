#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
// Run the MCP server
(0, index_1.main)().catch((error) => {
    console.error("Fatal error in CLI:", error);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map