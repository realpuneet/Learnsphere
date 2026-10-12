/** Keep only http(s) URLs for profile links (blocks javascript: etc.). */
export const safeUrl = (u) => {
  if (!u) return undefined;
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.toString() : undefined;
  } catch {
    return undefined;
  }
};
export const normalizeLinks = (links = {}) => Object.fromEntries(['website', 'linkedin', 'github', 'twitter'].map((k) => [k, safeUrl(links[k])]));
