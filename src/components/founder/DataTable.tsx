"use client";

import React, { useMemo, useState } from "react";

import { Skeleton } from "./Skeleton";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (row: T) => React.ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: string;
  onRowClick?: (row: T) => void;
  tableClassName?: string;
};

type SortState = {
  key: string | null;
  direction: "asc" | "desc";
};

export function DataTable<T>({ columns, data, loading, emptyState, onRowClick, tableClassName }: Props<T>) {
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });

  const sorted = useMemo(() => {
    if (!sort.key) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sort.key ?? ""] ?? "";
      const bValue = (b as Record<string, unknown>)[sort.key ?? ""] ?? "";
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();
      if (aString < bString) return sort.direction === "asc" ? -1 : 1;
      if (aString > bString) return sort.direction === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, sort]);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    const key = String(column.key);
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const renderSkeletonRows = () => {
    return Array.from({ length: 6 }).map((_, idx) => (
      <tr key={`skeleton-${idx}`}>
        {columns.map((col, colIdx) => (
          <td key={`s-${idx}-${colIdx}`} style={col.align ? { textAlign: col.align } : undefined}>
            <Skeleton width="80%" />
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="founder-table">
      <div className="founder-table__container">
        <table className={tableClassName}>
          <colgroup>
            {columns.map((column) => (
              <col key={String(column.key)} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={
                    column.width || column.align
                      ? { ...(column.width ? { width: column.width } : {}), ...(column.align ? { textAlign: column.align } : {}) }
                      : undefined
                  }
                  className={[column.sortable ? "is-sortable" : "", column.className || ""].filter(Boolean).join(" ") || undefined}
                  onClick={() => handleSort(column)}
                >
                  <div className="founder-table__header-cell">
                    <span>{column.header}</span>
                    {sort.key === String(column.key) ? (
                      <span aria-hidden="true" className="founder-table__sort-indicator">
                        {sort.direction === "asc" ? "↑" : "↓"}
                      </span>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              renderSkeletonRows()
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="founder-table__empty">
                  {emptyState || "No records found."}
                </td>
              </tr>
            ) : (
              sorted.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={onRowClick ? "is-clickable" : undefined}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={column.className}
                      style={column.align ? { textAlign: column.align } : undefined}
                    >
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key as string] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
