interface EmptyStateProps {
  title: string;
  hint?: string;
  embedded?: boolean;
}

export function EmptyState({ title, hint, embedded = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-8 text-center ${
        embedded ? "py-10" : "flex-1 py-16"
      }`}
    >
      <p className="text-[14px] text-neutral-600 dark:text-neutral-400">
        {title}
      </p>
      {hint && (
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  );
}
