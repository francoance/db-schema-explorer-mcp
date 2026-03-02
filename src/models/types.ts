export interface TableColumn {
  name: string;
  dataType: string;
  maxLength: number | null;
  isNullable: boolean;
}

export interface ForeignKey {
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface TableSchema {
  tableName: string;
  columns: TableColumn[];
  foreignKeys: ForeignKey[];
}
