import { useEffect, useState } from "react";
import { getSignedWorkspaceAssetUrl } from "../lib/workspaceStorage";

interface StorageImageProps {
  path: string;
  alt?: string;
}

export function StorageImage({ path, alt = "" }: StorageImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setUrl(null);

    void getSignedWorkspaceAssetUrl(path)
      .then((signed) => {
        if (!cancelled) setUrl(signed);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (failed) {
    return (
      <span className="text-[12px] text-neutral-400">Image unavailable</span>
    );
  }

  if (!url) {
    return (
      <span className="text-[12px] text-neutral-400">Loading image…</span>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className="my-2 max-h-80 max-w-full rounded-md border border-neutral-200 dark:border-neutral-700"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
