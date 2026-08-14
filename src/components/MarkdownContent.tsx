import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  DEVTASK_ASSET_PREFIX,
  devtaskAssetPath,
  isDevtaskAssetUrl,
} from "../lib/workspaceStorage";
import { StorageImage } from "./StorageImage";

interface MarkdownContentProps {
  source: string;
  className?: string;
  compact?: boolean;
}

function markdownUrlTransform(url: string): string {
  if (url.startsWith(DEVTASK_ASSET_PREFIX)) return url;
  return defaultUrlTransform(url);
}

export function MarkdownContent({
  source,
  className = "",
  compact = false,
}: MarkdownContentProps) {
  return (
    <div
      className={`markdown-body ${compact ? "markdown-compact" : ""} ${className}`.trim()}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={markdownUrlTransform}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => {
            if (isDevtaskAssetUrl(src)) {
              return (
                <StorageImage path={devtaskAssetPath(src!)} alt={alt ?? ""} />
              );
            }
            return (
              <img
                src={src}
                alt={alt ?? ""}
                className="my-2 max-h-80 max-w-full rounded-md border border-neutral-200 dark:border-neutral-700"
                loading="lazy"
              />
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
