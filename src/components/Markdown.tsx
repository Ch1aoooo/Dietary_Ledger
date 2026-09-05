import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";
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
        // remark-gfm：react-markdown 預設只認 CommonMark，表格/刪除線這些
        // GFM 語法沒有這個 plugin 不會被解析成表格，只會照原始文字（一堆
        // | 和 - 排成的線）印出來。
        // remark-cjk-friendly：CommonMark 的 emphasis 判斷規則（flanking
        // rule）在粗體標記緊貼著中文標點時會出問題——例如「**步驟一：**
        // 內容」，右邊的 ** 前面接的是全形冒號、後面緊接不是空白的中文字，
        // 不符合「right-flanking」規則，會被判定成沒辦法收尾，整段
        // `**...**` 就原封不動當純文字印出來。這在中文 AI 回覆很常見
        // （「**標題：**說明」這種寫法），這個 plugin 專門修正這個規則。
        remarkPlugins={[remarkGfm, remarkCjkFriendly]}
        components={{
          // react-markdown 傳給每個自訂 component 的 props 裡有一個
          // `node`（對應的 mdast/hast AST 節點），不是合法的 DOM
          // 屬性——原本這裡整包 {...props} 往下丟給原生 DOM 元素，
          // React 就會把它當成字面字串屬性塞進 HTML（每個元素都多一個
          // node="[object Object]"），雖然不影響顯示，但都是雜訊，也會
          // 讓瀏覽器主控台一直跳「React does not recognize the `node`
          // prop」的警告。統一在最上面解構掉，其餘 props 才轉交給
          // DOM 元素。
          p: ({ node, ...p }) => <p className="mb-2 last:mb-0" {...p} />,
          h1: ({ node, ...h }) => (
            <h1 className="mb-2 mt-3 text-base font-bold first:mt-0" {...h} />
          ),
          h2: ({ node, ...h }) => (
            <h2 className="mb-2 mt-3 text-[15px] font-bold first:mt-0" {...h} />
          ),
          h3: ({ node, ...h }) => (
            <h3 className="mb-2 mt-2 text-sm font-bold first:mt-0" {...h} />
          ),
          h4: ({ node, ...h }) => <h4 className="mb-1 mt-2 text-sm font-semibold" {...h} />,
          ul: ({ node, ...u }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...u} />
          ),
          ol: ({ node, ...o }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...o} />
          ),
          li: ({ node, ...l }) => <li className="leading-relaxed" {...l} />,
          strong: ({ node, ...s }) => <strong className="font-semibold" {...s} />,
          em: ({ node, ...e }) => <em className="italic" {...e} />,
          a: ({ node, ...a }) => (
            <a
              className="text-tealink underline decoration-tealink/40 underline-offset-2"
              target="_blank"
              rel="noreferrer"
              {...a}
            />
          ),
          code: ({ node, ...c }) => (
            <code
              className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground"
              {...c}
            />
          ),
          blockquote: ({ node, ...b }) => (
            <blockquote
              className="my-2 border-l-2 border-border pl-3 text-muted-foreground"
              {...b}
            />
          ),
          hr: () => <hr className="my-3 border-border/70" />,
          table: ({ node, ...t }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs" {...t} />
            </div>
          ),
          th: ({ node, ...th }) => (
            <th
              className="border border-border bg-muted/60 px-2 py-1 text-left font-semibold"
              {...th}
            />
          ),
          td: ({ node, ...td }) => (
            <td className="border border-border px-2 py-1" {...td} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
