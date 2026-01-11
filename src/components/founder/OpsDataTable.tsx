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
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowAriaLabel?: (row: T) => string;
  tableClassName?: string;
  /** Rows per page for pagination. If not set, pagination is disabled. */
  pageSize?: number;
  /** Total items from server (enables server-side pagination when provided with onPageChange) */
  totalItems?: number;
  /** Current page for server-side pagination (1-indexed) */
  currentPage?: number;
  /** Callback when page changes (enables server-side pagination when provided with totalItems) */
  onPageChange?: (page: number) => void;
};

export function OpsDataTable<T>({
  columns,
  data,
  loading,
  emptyState,
  onRowClick,
  rowAriaLabel,
  tableClassName,
  pageSize,
  totalItems,
  currentPage,
  onPageChange,
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
      <div className="glass-card founder-card">
        <DataTable<T>
          columns={computedColumns}
          data={data}
          loading={loading}
          emptyState={emptyState}
          onRowClick={onRowClick}
          rowAriaLabel={rowAriaLabel}
          tableClassName={combinedTableClassName}
          pageSize={pageSize}
          totalItems={totalItems}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
