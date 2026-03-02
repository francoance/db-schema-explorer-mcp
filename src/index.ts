#!/usr/bin/env node

import sql from "mssql";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetTablesTool } from "./tools/get-tables.js";
import { registerGetTableSchemaTool } from "./tools/get-table-schema.js";

async function main(): Promise<void> {
  const connectionString = process.argv[2];

  if (!connectionString) {
    console.error(
      "Usage: db-schema-explorer-mcp <connection-string>\n" +
        'Example: db-schema-explorer-mcp "Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True"'
    );
    process.exit(1);
  }

  // Connect to SQL Server
  let pool: sql.ConnectionPool;
  try {
    pool = await sql.connect(connectionString);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to connect to database: ${message}`);
    process.exit(1);
  }

  // Create MCP server
  const server = new McpServer({
    name: "db-schema-explorer",
    version: "1.0.0",
  });

  // Register tools
  registerGetTablesTool(server, pool);
  registerGetTableSchemaTool(server, pool);

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await pool.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await pool.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
