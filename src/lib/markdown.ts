/** Strip common markdown syntax for short plain-text previews. */
export function plainTextFromMarkdown(source: string, maxLength?: number): string {
  let text = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (maxLength && text.length > maxLength) {
    text = `${text.slice(0, maxLength).trimEnd()}…`;
  }

  return text;
}
