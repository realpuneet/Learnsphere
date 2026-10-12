/** Detect how a lesson video should be played by the client. */
export function detectVideoProvider(url = '') {
  if (!url) return null;
  if (/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)/i.test(url)) return 'youtube';
  if (/vimeo\.com\//i.test(url)) return 'vimeo';
  if (/\.m3u8(\?|$)/i.test(url)) return 'hls';
  return 'file';
}
