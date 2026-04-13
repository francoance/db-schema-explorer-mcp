import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type sql from "mssql";
import { queryTable } from "../services/schema-service.js";
import type { QueryTableResult } from "../models/types.js";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `<binary ${value.length} bytes>`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatRow(row: Record<string, unknown>, columns: string[], index: number): string {
  const lines = [`## Row ${index + 1}`];
  for (const column of columns) {
    lines.push(`- ${column}: ${formatValue(row[column])}`);
  }
  return lines.join("\n");
}

function formatQueryResult(
  result: QueryTableResult,
  top: number,
  orderBy: string,
  filters: string | undefined
): string {
  const header = [
    `# Query Results: ${result.tableName}`,
    `Rows returned: ${result.rows.length}`,
    `top: ${top} | order_by: ${orderBy} | filters: ${filters && filters.trim() ? filters : "(none)"}`,
  ];

  if (result.rows.length === 0) {
    return [...header, "", "(no rows)"].join("\n");
  }

  const body = result.rows.map((row, i) => formatRow(row, result.columns, i));
  return [...header, "", ...body.flatMap((section) => [section, ""])].join("\n").trimEnd();
}

export function registerQueryTableTool(
  server: McpServer,
  pool: sql.ConnectionPool
): void {
  server.registerTool(
    "query_table",
    {
      title: "Query Table",
      description:
        "Run a SELECT against a table. Returns up to `top` rows matching `filters`, sorted by `orderBy`. " +
        "`orderBy` and `filters` are raw SQL fragments inserted verbatim into ORDER BY and WHERE clauses.",
      inputSchema: {
        tableName: z
          .string()
          .describe("The exact name of the table to query"),
        top: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum number of rows to return (default: 10)"),
        orderBy: z
          .string()
          .optional()
          .describe(
            "Raw SQL for the ORDER BY clause, e.g. 'created_at desc' (default: '1 desc')"
          ),
        filters: z
          .string()
          .optional()
          .describe(
            "Raw SQL for the WHERE clause, e.g. \"id = 123 and other is not null\". Omit for no filter."
          ),
      },
    },
    async ({ tableName, top, orderBy, filters }) => {
      const effectiveTop = top ?? 10;
      const effectiveOrderBy = orderBy ?? "1 desc";

      try {
        const result = await queryTable(
          pool,
          tableName,
          effectiveTop,
          effectiveOrderBy,
          filters
        );

        return {
          content: [
            {
              type: "text" as const,
              text: formatQueryResult(result, effectiveTop, effectiveOrderBy, filters),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error querying "${tableName}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
