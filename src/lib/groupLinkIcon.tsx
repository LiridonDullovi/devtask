import {
  IconBrandBitbucket,
  IconBrandDiscord,
  IconBrandDocker,
  IconBrandDropbox,
  IconBrandFigma,
  IconBrandGit,
  IconBrandGithub,
  IconBrandGitlab,
  IconBrandGoogle,
  IconBrandGoogleDrive,
  IconBrandJira,
  IconBrandNpm,
  IconBrandNotion,
  IconBrandSlack,
  IconBrandStackoverflow,
  IconBrandVercel,
  IconBrandYoutube,
  IconExternalLink,
  IconFolder,
  IconLink,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";
import type { GroupLink } from "../types";

type LinkIconInfo = {
  Icon: ComponentType<IconProps>;
  hint: string;
};

function getHostname(url: string): string | null {
  try {
    const withProtocol = url.startsWith("http") ? url : `https://${url}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function getUrlPath(url: string): string {
  try {
    const withProtocol = url.startsWith("http") ? url : `https://${url}`;
    return new URL(withProtocol).pathname;
  } catch {
    return "";
  }
}

export function getGroupLinkIcon(link: GroupLink): LinkIconInfo {
  if (link.kind === "folder") {
    return { Icon: IconFolder, hint: "Folder" };
  }

  const host = getHostname(link.url) ?? "";
  const urlLower = link.url.toLowerCase();

  if (host.includes("github.com") || host.endsWith("github.io")) {
    return { Icon: IconBrandGithub, hint: "GitHub" };
  }
  if (host.includes("gitlab")) {
    return { Icon: IconBrandGitlab, hint: "GitLab" };
  }
  if (host.includes("bitbucket")) {
    return { Icon: IconBrandBitbucket, hint: "Bitbucket" };
  }
  if (host.includes("notion.")) {
    return { Icon: IconBrandNotion, hint: "Notion" };
  }
  if (host.includes("figma.com")) {
    return { Icon: IconBrandFigma, hint: "Figma" };
  }
  if (host.includes("linear.app")) {
    return { Icon: IconLink, hint: "Linear" };
  }
  if (host.includes("vercel.app") || host === "vercel.com") {
    return { Icon: IconBrandVercel, hint: "Vercel" };
  }
  if (host.includes("jira")) {
    return { Icon: IconBrandJira, hint: "Jira" };
  }
  if (host.includes("stackoverflow")) {
    return { Icon: IconBrandStackoverflow, hint: "Stack Overflow" };
  }
  if (host.includes("npmjs") || host === "npm.io") {
    return { Icon: IconBrandNpm, hint: "npm" };
  }
  if (host.includes("docker")) {
    return { Icon: IconBrandDocker, hint: "Docker" };
  }
  if (host.includes("slack.com")) {
    return { Icon: IconBrandSlack, hint: "Slack" };
  }
  if (host.includes("discord.")) {
    return { Icon: IconBrandDiscord, hint: "Discord" };
  }
  if (host.includes("youtube.") || host === "youtu.be") {
    return { Icon: IconBrandYoutube, hint: "YouTube" };
  }
  if (host.includes("drive.google")) {
    return { Icon: IconBrandGoogleDrive, hint: "Google Drive" };
  }
  if (host.includes("google.")) {
    return { Icon: IconBrandGoogle, hint: "Google" };
  }
  if (host.includes("dropbox.")) {
    return { Icon: IconBrandDropbox, hint: "Dropbox" };
  }
  if (urlLower.endsWith(".git") || urlLower.startsWith("git@")) {
    return { Icon: IconBrandGit, hint: "Git" };
  }

  return { Icon: IconExternalLink, hint: "Website" };
}

export function getGroupLinkDisplayLabel(link: GroupLink): string {
  if (link.label?.trim()) return link.label.trim();
  if (link.kind === "folder") {
    const parts = link.url.split(/[/\\]/).filter(Boolean);
    return parts[parts.length - 1] ?? "Folder";
  }

  const host = getHostname(link.url);
  if (host?.includes("github.com")) {
    const parts = getUrlPath(link.url).split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  }

  if (host) return host;
  return link.url;
}

interface GroupLinkIconProps {
  link: GroupLink;
  size?: number;
  className?: string;
}

export function GroupLinkIcon({ link, size = 13, className }: GroupLinkIconProps) {
  const { Icon } = getGroupLinkIcon(link);
  return <Icon size={size} stroke={1.75} className={className} />;
}
