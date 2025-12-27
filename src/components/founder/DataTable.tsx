"use client";

import React, { useMemo, useState } from "react";

import styles from "./DataTable.module.css";
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
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowAriaLabel?: (row: T) => string;
  tableClassName?: string;
  /** Enable responsive card layout on mobile */
  responsiveCards?: boolean;
};

type SortState = {
  key: string | null;
  direction: "asc" | "desc";
};

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyState,
  onRowClick,
  rowAriaLabel,
  tableClassName,
  responsiveCards = true,
}: Props<T>) {
  const [sort, setSort] = useState<SortState>({ key: null, direction: "asc" });

  const shouldIgnoreRowClick = (target: EventTarget | null) => {
    const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    if (!element) return false;
    if (element.closest("[data-no-row-click]")) return true;
    return Boolean(element.closest("a, button, input, select, textarea, [role='button']"));
  };

  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) return;
    if (event.defaultPrevented) return;
    if (shouldIgnoreRowClick(event.target)) return;
    onRowClick(row);
  };

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

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (!onRowClick) return;
    if (shouldIgnoreRowClick(event.target)) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  };

  const renderSkeletonRows = () => {
    return Array.from({ length: 6 }).map((_, idx) => (
      <tr key={`skeleton-${idx}`} style={{ animationDelay: `${idx * 50}ms` }}>
        {columns.map((col, colIdx) => (
          <td key={`s-${idx}-${colIdx}`} style={col.align ? { textAlign: col.align } : undefined}>
            <Skeleton variant="tableCell" width={colIdx === 0 ? "70%" : "60%"} />
          </td>
        ))}
      </tr>
    ));
  };

  const wrapperClass = [styles.table, responsiveCards ? styles.responsiveCards : ""].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass}>
      <div className={styles.container}>
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
                  className={[column.sortable ? styles.sortable : "", column.className || ""].filter(Boolean).join(" ") || undefined}
                  onClick={() => handleSort(column)}
                >
                  <div className={styles.headerCell}>
                    <span>{column.header}</span>
                    {sort.key === String(column.key) ? (
                      <span aria-hidden="true" className={styles.sortIndicator}>
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
                <td colSpan={columns.length} className={styles.empty}>
                  {emptyState || "No records found."}
                </td>
              </tr>
            ) : (
              sorted.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={onRowClick ? styles.clickable : undefined}
                  onClick={onRowClick ? (event) => handleRowClick(event, row) : undefined}
                  onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "link" : undefined}
                  aria-label={rowAriaLabel ? rowAriaLabel(row) : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={column.className}
                      style={column.align ? { textAlign: column.align } : undefined}
                      data-label={responsiveCards ? column.header : undefined}
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
