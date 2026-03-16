# db-schema-explorer-mcp

MCP server for exploring SQL Server database schemas. Exposes two tools over the Model Context Protocol (stdio transport).

The server accepts a SQL Server connection string via **environment variable** (recommended) or **CLI argument**. Both `Server=` and `Data Source=` style connection strings are supported.

## Tools

### `get_tables`

List table names in the database.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nameFilter` | string | No | Partial match filter for table names |

Returns plain text with one table name per line.

### `get_table_schema`

Get detailed schema for a specific table.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tableName` | string | Yes | Exact table name to inspect |

Returns Markdown optimized for agent consumption with predictable sections for columns, foreign keys, and indexes.

Example output:

```md
# Table: users

## Columns
- id | type: int | nullable: no | max_length: -
- email | type: nvarchar | nullable: no | max_length: 255

## Foreign Keys
- FK_users_roles | column: role_id | references: roles.id

## Indexes
- PK_users | primary_key: yes | unique: yes | columns: id
```

## MCP Client Configuration

### Claude Desktop

Add to `claude_desktop_config.json` (located at `%APPDATA%\Claude\` on Windows, `~/Library/Application Support/Claude/` on macOS):

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

### OpenCode

Add to `.opencode/mcp.json` in your project root:

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

### Cursor

Add to `.cursor/mcp.json` in your project root:

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

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "db-schema-explorer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "db-schema-explorer-mcp"],
      "env": {
        "DB_CONNECTION_STRING": "Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

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

## Development

```bash
npm install
npm run build
node dist/index.js
```

### Connection string via environment variable

```bash
# Linux / macOS
DB_CONNECTION_STRING="Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True" node dist/index.js

# Windows (cmd)
set "DB_CONNECTION_STRING=Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True"
node dist/index.js
```

### Connection string via CLI argument

```bash
node dist/index.js "Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True"
```

> **Note:** On Windows, semicolons in connection strings can cause issues with shell argument parsing. Prefer the environment variable approach.

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

This opens a browser UI where you can call both tools interactively and inspect the text and Markdown responses.

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
