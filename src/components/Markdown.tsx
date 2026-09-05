import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/** 把 LLM 吐的 Markdown 渲染成好看、安全的畫面（不渲染原始 HTML，防 XSS） */
export function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown text-sm leading-relaxed", className)}>
      <ReactMarkdown
        components={{
          p: (p) => <p className="mb-2 last:mb-0" {...p} />,
          h1: (h) => (
            <h1 className="mb-2 mt-3 text-base font-bold first:mt-0" {...h} />
          ),
          h2: (h) => (
            <h2 className="mb-2 mt-3 text-[15px] font-bold first:mt-0" {...h} />
          ),
          h3: (h) => (
            <h3 className="mb-2 mt-2 text-sm font-bold first:mt-0" {...h} />
          ),
          h4: (h) => <h4 className="mb-1 mt-2 text-sm font-semibold" {...h} />,
          ul: (u) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...u} />
          ),
          ol: (o) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...o} />
          ),
          li: (l) => <li className="leading-relaxed" {...l} />,
          strong: (s) => <strong className="font-semibold" {...s} />,
          em: (e) => <em className="italic" {...e} />,
          a: (a) => (
            <a
              className="text-tealink underline decoration-tealink/40 underline-offset-2"
              target="_blank"
              rel="noreferrer"
              {...a}
            />
          ),
          code: (c) => (
            <code
              className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
              {...c}
            />
          ),
          blockquote: (b) => (
            <blockquote
              className="my-2 border-l-2 border-border pl-3 text-muted-foreground"
              {...b}
            />
          ),
          hr: () => <hr className="my-3 border-border/70" />,
          table: (t) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...t} />
            </div>
          ),
          th: (th) => (
            <th
              className="border border-border bg-muted/60 px-2 py-1 text-left font-semibold"
              {...th}
            />
          ),
          td: (td) => (
            <td className="border border-border px-2 py-1" {...td} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
