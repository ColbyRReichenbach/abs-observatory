"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Client component that renders a Mermaid diagram definition into inline SVG.
 * Uses the mermaid CDN to avoid bundling the full library.
 */
export function MermaidDiagram({ definition, className }: { definition: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mermaidModule = await (Function('return import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")')() as Promise<any>);
        const mermaid = mermaidModule.default;

        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            fontSize: "13px",
            primaryColor: "#f8f3eb",
            primaryBorderColor: "#2c2c2c",
            primaryTextColor: "#2c2c2c",
            lineColor: "#8b0000",
            secondaryColor: "#f0ebe3",
            tertiaryColor: "#e8e1d5",
            noteBkgColor: "#f8f3eb",
            noteTextColor: "#2c2c2c",
            clusterBkg: "#f0ebe3",
            clusterBorder: "#c9c0b3",
          },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, definition.trim());

        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = svg;
        setLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [definition]);

  if (error) {
    return (
      <div className={`border border-black/10 bg-[#f8f3eb] p-4 text-sm text-[#7d6c54] ${className ?? ""}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.24em]">Diagram</p>
        <p className="mt-2">Could not render diagram.</p>
      </div>
    );
  }

  return (
    <div
      className={`overflow-x-auto border border-black/10 bg-[#f8f3eb] p-6 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
    >
      <div ref={containerRef} className="mx-auto flex justify-center [&_svg]:max-w-full" />
    </div>
  );
}
