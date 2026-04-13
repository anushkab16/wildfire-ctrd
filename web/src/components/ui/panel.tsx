"use client";

import React from "react";

interface PanelProps {
  title: string;
  count?: number | string | null;
  status?: string;
  statusClass?: "monitoring" | "elevated" | "critical" | "";
  loading?: boolean;
  error?: string | null;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapse?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const statusColors: Record<string, string> = {
  monitoring: "color: var(--text-secondary); background: rgba(255,255,255,0.05)",
  elevated: "color: #ffa500; background: rgba(255,165,0,0.15)",
  critical: "color: #ff4444; background: rgba(255,68,68,0.15)",
};

export function Panel({
  title,
  count,
  status,
  statusClass = "",
  loading = false,
  error,
  collapsible = false,
  collapsed = false,
  onCollapse,
  actions,
  children,
  className = "",
}: PanelProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        breakInside: "avoid",
        marginBottom: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 0.75rem",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          minHeight: "2rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h3
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            {title}
          </h3>
          {count != null && (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 500,
                color: "var(--accent)",
                background: `rgba(${("var(--accent-rgb)")}, 0.1)`,
                padding: "0.1rem 0.4rem",
                borderRadius: 3,
              }}
            >
              {count}
            </span>
          )}
          {status && (
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                padding: "0.1rem 0.4rem",
                borderRadius: 3,
                textTransform: "uppercase",
                ...(statusClass && statusColors[statusClass]
                  ? Object.fromEntries(
                      statusColors[statusClass]
                        .split(";")
                        .map((s) => s.trim().split(":").map((v) => v.trim()))
                    )
                  : { color: "var(--text-secondary)" }),
              }}
            >
              {status}
            </span>
          )}
          {loading && (
            <div
              style={{
                width: 12,
                height: 12,
                border: "2px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {actions}
          {collapsible && (
            <button
              onClick={onCollapse}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "0.25rem",
                fontSize: "0.5rem",
                lineHeight: 1,
              }}
            >
              {collapsed ? "\u25BC" : "\u25B2"}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.5rem",
          display: collapsed ? "none" : undefined,
        }}
      >
        {error ? (
          <p
            style={{
              color: "var(--danger)",
              textAlign: "center",
              padding: "1rem",
              fontSize: "0.7rem",
              margin: 0,
            }}
          >
            {error}
          </p>
        ) : loading && !React.Children.count(children) ? (
          <p
            style={{
              color: "var(--text-secondary)",
              textAlign: "center",
              padding: "1rem",
              fontSize: "0.7rem",
              margin: 0,
            }}
          >
            Loading...
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
