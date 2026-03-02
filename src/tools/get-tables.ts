import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type sql from "mssql";
import { getTables } from "../services/schema-service.js";

export function registerGetTablesTool(
  server: McpServer,
  pool: sql.ConnectionPool
): void {
  server.registerTool(
    "get_tables",
    {
      title: "Get Tables",
      description:
        "List table names in the database. Optionally filter by name.",
      inputSchema: {
        nameFilter: z
          .string()
          .optional()
          .describe(
            "Optional filter to match table names (case-insensitive, partial match)"
          ),
      },
    },
    async ({ nameFilter }) => {
      try {
        const tables = await getTables(pool, nameFilter);

        if (tables.length === 0) {
          const msg = nameFilter
            ? `No tables found matching "${nameFilter}".`
            : "No tables found in the database.";
          return { content: [{ type: "text" as const, text: msg }] };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(tables, null, 2),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            { type: "text" as const, text: `Error listing tables: ${message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
