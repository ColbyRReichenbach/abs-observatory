import type { ReactNode } from "react";

import { cn } from "@/lib/ui";

export function EditorialProse({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-neutral max-w-none text-pretty",
        "prose-headings:font-display prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-[#1f1f1f]",
        "prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-3xl md:prose-h2:text-4xl",
        "prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-2xl",
        "prose-p:my-0 prose-p:font-serif prose-p:text-[1.02rem] prose-p:leading-8 prose-p:text-[#3d3d3d]",
        "[&_p+p]:mt-5",
        "[&_h2+p]:mt-4 [&_h3+p]:mt-3 [&_blockquote+p]:mt-5",
        "prose-strong:font-semibold prose-strong:text-[#1f1f1f]",
        "prose-a:text-[#8b0000] prose-a:decoration-black/20 prose-a:underline-offset-4 hover:prose-a:text-black",
        "prose-blockquote:border-l prose-blockquote:border-black/20 prose-blockquote:pl-5 prose-blockquote:font-serif prose-blockquote:text-lg prose-blockquote:italic prose-blockquote:text-[#2c2c2c]",
        "[&_pre]:my-5 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-black/10 [&_pre]:bg-[#f5f0e8] [&_pre]:p-4 [&_pre]:text-[0.86rem] [&_pre]:leading-6 [&_pre]:text-[#2c2c2c]",
        "prose-code:break-words prose-code:rounded prose-code:bg-[#f5f0e8] prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.92em] prose-code:text-[#2c2c2c]",
        "[&_pre_code]:whitespace-pre-wrap [&_pre_code]:break-words [&_pre_code]:rounded-none [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_ul]:my-6 [&_ul]:space-y-3 [&_ul]:border-l [&_ul]:border-black/10 [&_ul]:pl-0",
        "[&_ul>li]:relative [&_ul>li]:list-none [&_ul>li]:pl-8 [&_ul>li]:font-serif [&_ul>li]:text-[1.02rem] [&_ul>li]:leading-8 [&_ul>li]:text-[#3d3d3d]",
        "[&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[0.95rem] [&_ul>li]:before:h-1.5 [&_ul>li]:before:w-1.5 [&_ul>li]:before:rounded-full [&_ul>li]:before:bg-[#8b0000]",
        "[&_ul>li>p]:my-0",
        "[&_ol]:my-6 [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-7",
        "[&_ol>li]:font-serif [&_ol>li]:text-[1.02rem] [&_ol>li]:leading-8 [&_ol>li]:text-[#3d3d3d]",
        "[&_ol>li>p]:my-0",
        "[&_ul+p]:mt-6 [&_ol+p]:mt-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EditorialParagraphStack({
  paragraphs,
  className,
  emphasizeLead = false,
}: {
  paragraphs: string[];
  className?: string;
  emphasizeLead?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${index}-${paragraph.slice(0, 24)}`}
          className={cn(
            "font-serif text-[1.02rem] leading-8 text-[#3d3d3d]",
            index > 0 && "mt-5 md:mt-6",
            emphasizeLead && index === 0 && "text-[1.1rem] leading-9 text-[#2c2c2c]",
          )}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
