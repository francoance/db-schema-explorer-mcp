import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type sql from "mssql";
import { getTableSchema } from "../services/schema-service.js";
import type { TableColumn, ForeignKey, TableIndex, TableSchema } from "../models/types.js";

function formatColumn(column: TableColumn): string {
  return [
    `- ${column.name}`,
    `type: ${column.dataType}`,
    `nullable: ${column.isNullable ? "yes" : "no"}`,
    `max_length: ${column.maxLength ?? "-"}`,
  ].join(" | ");
}

function formatForeignKey(foreignKey: ForeignKey): string {
  return [
    `- ${foreignKey.constraintName}`,
    `column: ${foreignKey.columnName}`,
    `references: ${foreignKey.referencedTable}.${foreignKey.referencedColumn}`,
  ].join(" | ");
}

function formatIndex(index: TableIndex): string {
  return [
    `- ${index.indexName}`,
    `primary_key: ${index.isPrimaryKey ? "yes" : "no"}`,
    `unique: ${index.isUnique ? "yes" : "no"}`,
    `columns: ${index.columns.join(", ")}`,
  ].join(" | ");
}

function formatSection<T>(
  title: string,
  items: T[],
  formatter: (item: T) => string
): string {
  const lines = items.length > 0 ? items.map(formatter) : ["- none"];
  return [`## ${title}`, ...lines].join("\n");
}

function formatTableSchema(schema: TableSchema): string {
  return [
    `# Table: ${schema.tableName}`,
    "",
    formatSection("Columns", schema.columns, formatColumn),
    "",
    formatSection("Foreign Keys", schema.foreignKeys, formatForeignKey),
    "",
    formatSection("Indexes", schema.indexes, formatIndex),
  ].join("\n");
}

export function registerGetTableSchemaTool(
  server: McpServer,
  pool: sql.ConnectionPool
): void {
  server.registerTool(
    "get_table_schema",
    {
      title: "Get Table Schema",
      description:
        "Get detailed schema information for a table, including columns (name, type, nullability), foreign keys, and indexes.",
      inputSchema: {
        tableName: z
          .string()
          .describe("The exact name of the table to inspect"),
      },
    },
    async ({ tableName }) => {
      try {
        const schema = await getTableSchema(pool, tableName);

        if (schema.columns.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Table "${tableName}" not found or has no columns.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: formatTableSchema(schema),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error getting schema for "${tableName}": ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
