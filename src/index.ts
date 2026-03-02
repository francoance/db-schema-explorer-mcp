#!/usr/bin/env node

import sql from "mssql";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetTablesTool } from "./tools/get-tables.js";
import { registerGetTableSchemaTool } from "./tools/get-table-schema.js";

function parseConnectionString(connectionString: string): sql.config {
  const pairs = connectionString
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  const map = new Map<string, string>();
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.substring(0, idx).trim().toLowerCase();
    const value = pair.substring(idx + 1).trim();
    map.set(key, value);
  }

  const server = map.get("server") ?? map.get("data source") ?? "";
  const [host, portStr] = server.includes(",")
    ? server.split(",", 2)
    : [server, undefined];

  const config: sql.config = {
    server: host,
    port: portStr ? parseInt(portStr, 10) : 1433,
    database:
      map.get("database") ?? map.get("initial catalog") ?? "",
    user: map.get("user id") ?? map.get("uid") ?? "",
    password: map.get("password") ?? map.get("pwd") ?? "",
    options: {
      encrypt: (map.get("encrypt") ?? "true").toLowerCase() === "true",
      trustServerCertificate:
        (map.get("trustservercertificate") ?? "false").toLowerCase() === "true",
    },
  };

  return config;
}

async function main(): Promise<void> {
  // Support both: CLI argument and environment variable
  // Env var is more reliable since semicolons in connection strings
  // can cause issues with shell argument parsing on Windows.
  const connectionString =
    process.argv[2] || process.env.DB_CONNECTION_STRING;

  if (!connectionString) {
    console.error(
      "Usage: db-schema-explorer-mcp <connection-string>\n" +
        "  or set the DB_CONNECTION_STRING environment variable.\n\n" +
        'Example: db-schema-explorer-mcp "Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True"\n' +
        '  or: DB_CONNECTION_STRING="Server=..." db-schema-explorer-mcp'
    );
    process.exit(1);
  }

  // Connect to SQL Server
  const dbConfig = parseConnectionString(connectionString);
  let pool: sql.ConnectionPool;
  try {
    pool = await sql.connect(dbConfig);
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
