import sql from "mssql";
import type { TableColumn, ForeignKey, TableIndex, TableSchema, QueryTableResult } from "../models/types.js";

async function tableExists(
  pool: sql.ConnectionPool,
  tableName: string
): Promise<boolean> {
  const request = pool.request();
  request.input("tableName", sql.NVarChar, tableName);
  const result = await request.query(`
    SELECT 1 AS found
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = @tableName
  `);
  return result.recordset.length > 0;
}

export async function queryTable(
  pool: sql.ConnectionPool,
  tableName: string,
  top: number,
  orderBy: string,
  filters?: string
): Promise<QueryTableResult> {
  if (!(await tableExists(pool, tableName))) {
    throw new Error(`Table "${tableName}" not found.`);
  }

  const quotedTable = `[${tableName.replace(/]/g, "]]")}]`;
  const whereClause = filters && filters.trim() ? ` WHERE ${filters}` : "";
  const query = `SELECT TOP (@top) * FROM ${quotedTable}${whereClause} ORDER BY ${orderBy}`;

  const request = pool.request();
  request.input("top", sql.Int, top);

  const result = await request.query(query);
  const columns = Object.keys(result.recordset.columns ?? {});
  return { tableName, columns, rows: result.recordset as Record<string, unknown>[] };
}

export async function getTables(
  pool: sql.ConnectionPool,
  nameFilter?: string
): Promise<string[]> {
  const request = pool.request();

  let query = `
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'`;

  if (nameFilter) {
    request.input("filter", sql.NVarChar, `%${nameFilter}%`);
    query += ` AND TABLE_NAME LIKE @filter`;
  }

  query += ` ORDER BY TABLE_NAME`;

  const result = await request.query(query);
  return result.recordset.map(
    (row: { TABLE_NAME: string }) => row.TABLE_NAME
  );
}

export async function getTableSchema(
  pool: sql.ConnectionPool,
  tableName: string
): Promise<TableSchema> {
  const columnsRequest = pool.request();
  columnsRequest.input("tableName", sql.NVarChar, tableName);

  const columnsResult = await columnsRequest.query(`
    SELECT
      COLUMN_NAME,
      DATA_TYPE,
      CHARACTER_MAXIMUM_LENGTH,
      IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = @tableName
    ORDER BY ORDINAL_POSITION
  `);

  const columns: TableColumn[] = columnsResult.recordset.map((row) => ({
    name: row.COLUMN_NAME as string,
    dataType: row.DATA_TYPE as string,
    maxLength: row.CHARACTER_MAXIMUM_LENGTH as number | null,
    isNullable: (row.IS_NULLABLE as string) === "YES",
  }));

  const fkRequest = pool.request();
  fkRequest.input("tableName", sql.NVarChar, tableName);

  const fkResult = await fkRequest.query(`
    SELECT
      kcu.COLUMN_NAME AS columnName,
      ccu.TABLE_NAME AS referencedTable,
      ccu.COLUMN_NAME AS referencedColumn,
      rc.CONSTRAINT_NAME AS constraintName
    FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
      ON rc.UNIQUE_CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
    WHERE kcu.TABLE_NAME = @tableName
  `);

  const foreignKeys: ForeignKey[] = fkResult.recordset.map((row) => ({
    constraintName: row.constraintName as string,
    columnName: row.columnName as string,
    referencedTable: row.referencedTable as string,
    referencedColumn: row.referencedColumn as string,
  }));

  const indexRequest = pool.request();
  indexRequest.input("tableName", sql.NVarChar, tableName);

  const indexResult = await indexRequest.query(`
    SELECT
      i.name AS indexName,
      i.is_unique AS isUnique,
      i.is_primary_key AS isPrimaryKey,
      c.name AS columnName
    FROM sys.indexes i
    JOIN sys.index_columns ic
      ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c
      ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    JOIN sys.tables t
      ON i.object_id = t.object_id
    WHERE t.name = @tableName
      AND i.name IS NOT NULL
    ORDER BY i.name, ic.key_ordinal
  `);

  const indexMap = new Map<string, TableIndex>();
  for (const row of indexResult.recordset) {
    const name = row.indexName as string;
    if (!indexMap.has(name)) {
      indexMap.set(name, {
        indexName: name,
        isUnique: row.isUnique as boolean,
        isPrimaryKey: row.isPrimaryKey as boolean,
        columns: [],
      });
    }
    indexMap.get(name)!.columns.push(row.columnName as string);
  }
  const indexes: TableIndex[] = Array.from(indexMap.values());

  return { tableName, columns, foreignKeys, indexes };
}
