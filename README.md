# db-schema-explorer-mcp

MCP server for exploring SQL Server database schemas. Exposes two tools over the Model Context Protocol (stdio transport):

- **`get_tables`** -- List table names, with optional name filter
- **`get_table_schema`** -- Get columns and foreign keys for a given table

## Quick Start

```bash
npx db-schema-explorer-mcp
```

Or install globally:

```bash
npm install -g db-schema-explorer-mcp
db-schema-explorer-mcp
```

## Usage

The server accepts a SQL Server connection string via **environment variable** (recommended) or **CLI argument**.

Both `Server=` and `Data Source=` style connection strings are supported.

### Environment variable (recommended)

```bash
# Linux / macOS
DB_CONNECTION_STRING="Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True" npx db-schema-explorer-mcp

# Windows (cmd)
set "DB_CONNECTION_STRING=Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True"
npx db-schema-explorer-mcp
```

### CLI argument

```bash
npx db-schema-explorer-mcp "Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True"
```

> **Note:** On Windows, semicolons in connection strings can cause issues with shell argument parsing. Prefer the environment variable approach.

## Development

```bash
npm install
npm run build
node dist/index.js
```

## Testing

### 1. MCP Inspector (interactive UI)

The easiest way to test. Create an `inspector-config.json` file:

```json
{
  "mcpServers": {
    "db-schema-explorer": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "DB_CONNECTION_STRING": "Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True"
      }
    }
  }
}
```

Then run:

```bash
npx @modelcontextprotocol/inspector --config inspector-config.json --server db-schema-explorer
```

This opens a browser UI where you can call both tools interactively and see the JSON responses.

### 2. Raw JSON-RPC (quick smoke test)

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js "Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True"
```

A successful response looks like:

```json
{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"db-schema-explorer","version":"1.0.0"}},"jsonrpc":"2.0","id":1}
```

### 3. No-database smoke test

```bash
node dist/index.js
```

Should print the usage message and exit with code 1.

## MCP Client Configuration

### OpenCode / Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "db-schema-explorer": {
      "command": "npx",
      "args": ["-y", "db-schema-explorer-mcp"],
      "env": {
        "DB_CONNECTION_STRING": "Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True"
      }
    }
  }
}
```

## Tools

### `get_tables`

List table names in the database.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nameFilter` | string | No | Partial match filter for table names |

### `get_table_schema`

Get detailed schema for a specific table.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tableName` | string | Yes | Exact table name to inspect |

Returns columns (name, data type, max length, nullability) and foreign keys (column, referenced table, referenced column, constraint name).
