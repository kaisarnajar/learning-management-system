import ReactMarkdown from "react-markdown";

type MarkdownTextProps = {
  content: string;
  className?: string;
};

export function MarkdownText({ content, className = "" }: MarkdownTextProps) {
  return (
    <div className={`markdown-body text-base leading-relaxed text-muted ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
          ul: ({ node, ...props }) => <ul className="mb-4 ml-4 list-inside list-disc space-y-1 last:mb-0" {...props} />,
          ol: ({ node, ...props }) => <ol className="mb-4 ml-4 list-inside list-decimal space-y-1 last:mb-0" {...props} />,
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          a: ({ node, ...props }) => <a className="font-medium text-primary hover:underline" {...props} />,
          h1: ({ node, ...props }) => <h1 className="mb-4 mt-6 text-2xl font-bold text-foreground" {...props} />,
          h2: ({ node, ...props }) => <h2 className="mb-3 mt-5 text-xl font-bold text-foreground" {...props} />,
          h3: ({ node, ...props }) => <h3 className="mb-2 mt-4 text-lg font-bold text-foreground" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="mb-4 border-l-4 border-gold pl-4 italic text-muted last:mb-0" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
