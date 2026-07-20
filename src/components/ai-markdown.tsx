"use client";

import ReactMarkdown from "react-markdown";

/** Markdown das respostas de IA, com espaçamento afinado para bolha de chat. */
export function AiMarkdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_strong]:font-medium">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="[&:not(:first-child)]:mt-2">{children}</p>,
          ul: ({ children }) => (
            <ul className="mt-2 ml-4 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-2 ml-4 list-decimal space-y-1">{children}</ol>
          ),
          h1: ({ children }) => (
            <h3 className="mt-3 font-medium">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mt-3 font-medium">{children}</h3>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 font-medium">{children}</h3>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
