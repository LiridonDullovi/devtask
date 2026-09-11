interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const REPO = "LiridonDullovi/devtask";
const RELEASES_PAGE = `https://github.com/${REPO}/releases`;

/** Which release asset each download link should resolve to. */
const PLATFORM_PATTERNS: Record<string, RegExp> = {
  "mac-arm": /aarch64\.dmg$/,
  "mac-intel": /x64\.dmg$/,
  windows: /x64-setup\.exe$/,
  linux: /\.AppImage$/,
};

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  draft: boolean;
  assets: GitHubAsset[];
}

/**
 * Deliberately lists releases rather than hitting /releases/latest: that
 * endpoint skips prereleases, and every build this workflow produces is
 * marked as one. Cached at the edge so we stay clear of GitHub's
 * unauthenticated rate limit, which is per-IP and therefore shared.
 */
async function findAsset(platform: string): Promise<string | null> {
  const pattern = PLATFORM_PATTERNS[platform];
  if (!pattern) return null;

  const response = await fetch(
    `https://api.github.com/repos/${REPO}/releases?per_page=10`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "devtask-web",
      },
      cf: { cacheTtl: 600, cacheEverything: true },
    } as RequestInit,
  );

  if (!response.ok) return null;

  const releases = (await response.json()) as GitHubRelease[];
  for (const release of releases) {
    if (release.draft) continue;
    const asset = release.assets.find((a) => pattern.test(a.name));
    if (asset) return asset.browser_download_url;
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const download = url.pathname.match(/^\/download\/([a-z-]+)\/?$/);

    if (download) {
      const target = await findAsset(download[1]);
      // No published release yet (or an unknown platform) — send people to
      // the releases page rather than a dead end.
      return Response.redirect(target ?? RELEASES_PAGE, 302);
    }

    return env.ASSETS.fetch(request);
  },
};
