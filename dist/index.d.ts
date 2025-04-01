import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export { listTemplates, analyzeTemplate, validateTemplate, createTemplate } from "./azd-tools.js";
export declare const createServer: () => McpServer;
export declare function formatValidationSection(title: string, items: string[], icon?: string): string;
export declare function registerTools(server: McpServer): void;
export declare function main(): Promise<McpServer>;
//# sourceMappingURL=index.d.ts.map