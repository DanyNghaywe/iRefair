"use client";

import React, { useMemo } from "react";

import { DataTable, type Column } from "./DataTable";

export type OpsColumn<T> = {
  key: keyof T | string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  nowrap?: boolean;
  ellipsis?: boolean;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
};

type OpsDataTableProps<T> = {
  columns: OpsColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: string;
  onRowClick?: (row: T) => void;
  tableClassName?: string;
};

export function OpsDataTable<T>({
  columns,
  data,
  loading,
  emptyState,
  onRowClick,
  tableClassName,
}: OpsDataTableProps<T>) {
  const combinedTableClassName = ["data-table", "ops-table", tableClassName].filter(Boolean).join(" ") || undefined;

  const computedColumns: Column<T>[] = useMemo(
    () =>
      columns.map((column) => {
        const cellClasses = [
          column.className || "",
          column.nowrap ? "col-nowrap cell-nowrap" : "",
          column.ellipsis ? "col-clip cell-ellipsis" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return {
          key: column.key,
          header: column.label,
          width: column.width,
          sortable: column.sortable,
          align: column.align,
          className: cellClasses || undefined,
          render: column.render,
        };
      }),
    [columns],
  );

  return (
    <div className="ops-data-table" style={{ width: "100%", minWidth: 0 }}>
      <div className="founder-card">
        <DataTable<T>
          columns={computedColumns}
          data={data}
          loading={loading}
          emptyState={emptyState}
          onRowClick={onRowClick}
          tableClassName={combinedTableClassName}
        />
      </div>
    </div>
  );
}
