<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is an MCP server project designed to help with Azure Developer CLI (azd) template development and validation.

Key components:
- Uses Model Context Protocol (MCP) to provide template-related tools
- Integrates with Azure Developer CLI (azd) for template operations
- Provides template analysis, validation, and best practices checking

When suggesting code for this project:
1. Follow MCP server implementation best practices
2. Use async/await for all file system and process operations
3. Include proper error handling for azd CLI operations
4. Validate inputs using Zod schemas
5. Format tool outputs in a clear, human-readable way
6. Include proper test for any new code added

For more information about MCP server development:
- MCP SDK documentation: https://modelcontextprotocol.io/sdk
- Azure Developer CLI docs: https://learn.microsoft.com/azure/developer/azure-developer-cli/