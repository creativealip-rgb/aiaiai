/**
 * Server Component that renders a Markdown product description.
 *
 * GitHub-flavored markdown (lists, tables, autolinks) is supported via
 * `remark-gfm`. `react-markdown` does not render arbitrary HTML unless we
 * explicitly enable a rehype raw plugin, which we don't — so admin input
 * can't inject <script> tags.
 *
 * Kept as a Server Component so the markdown string is never shipped to
 * the client; only the rendered HTML is.
 *
 * Styling lives under `.markdown-body` in `globals.css` to avoid pulling in
 * the full `@tailwindcss/typography` plugin.
 */

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownDescription({ content }: { content: string }) {
  return (
    <div className="markdown-body text-sm leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="nofollow noopener noreferrer" />,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
