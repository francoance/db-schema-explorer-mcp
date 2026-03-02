# Overview
I want to build an MCP server to solve very especific issues in my development workflow when it comes to using the company's database.

# Problem
My company database is huge and has huge gaps in how tables are configured. Whenever I develop new features I need to know the tables names and columns configuration for each table.

# Proposed solution
I want to build this MCP server with the following features:
1. Get tables: with an optional name filter, return a simple list of names of the tables that are in the database.
2. Get table schema: with a table name parameter, return all the relevant information about the table: columns (name, type, is nullable) and foreign keys (which column, what table it references, which column of said table)

# Specs
- No requirement on language for the server, offer alternatives on plan.
- It needs support for SQL Server database
