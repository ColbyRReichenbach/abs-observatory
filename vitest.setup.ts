import React from "react";
import { vi } from "vitest";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");

  function ResponsiveContainer({
    children,
    width = "100%",
    height = "100%",
    minHeight,
  }: {
    children: React.ReactNode;
    width?: number | string;
    height?: number | string;
    minHeight?: number;
  }) {
    const resolvedWidth = typeof width === "number" ? width : 800;
    const resolvedHeight =
      typeof height === "number" ? height : typeof minHeight === "number" ? minHeight : 320;

    return React.createElement(
      "div",
      {
        style: {
          width: resolvedWidth,
          height: resolvedHeight,
          minWidth: resolvedWidth,
          minHeight: resolvedHeight,
        },
      },
      children,
    );
  }

  return {
    ...actual,
    ResponsiveContainer,
  };
});
