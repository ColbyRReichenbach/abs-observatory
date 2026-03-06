import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/ui";

describe("ui primitives", () => {
  it("merges class names predictably", () => {
    const classes = cn("px-2", "text-white", "px-4");
    expect(classes).toContain("text-white");
    expect(classes).toContain("px-4");
    expect(classes).not.toContain("px-2");
  });

  it("renders badge variants", () => {
    const html = renderToStaticMarkup(<Badge variant="accent">Live</Badge>);
    expect(html).toContain("Live");
    expect(html).toContain("bg-cyan-300/20");
  });
});
