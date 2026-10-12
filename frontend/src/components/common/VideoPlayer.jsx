import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

const yt = (u) => /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(u)?.[1];
const vm = (u) => /vimeo\.com\/(?:video\/)?(\d+)/.exec(u)?.[1];

const SPEED_KEY = 'ls:speed';
const readSpeed = () => {
  try { return Number(localStorage.getItem(SPEED_KEY)) || 1; } catch { return 1; }
};

/**
 * Plays file / HLS (native only) / YouTube / Vimeo lessons.
 * onProgress(sec) fires at most every 10s for file videos; onEnded() when playback finishes.
 */
export function VideoPlayer({ url, provider, startAt = 0, onProgress, onEnded, title = 'Lesson video' }) {
  const ref = useRef(null);
  const last = useRef(0);
  const [hlsUnsupported, setHlsUnsupported] = useState(false);

  useEffect(() => {
    last.current = 0;
    setHlsUnsupported(false);
    const v = ref.current;
    if (provider === 'hls' && v && !v.canPlayType('application/vnd.apple.mpegurl')) setHlsUnsupported(true);
  }, [url, provider]);

  if (!url) return <div className="grid aspect-video place-items-center rounded-2xl bg-ink-900 text-sm text-ink-300">No video for this lesson</div>;

  if (provider === 'youtube' && yt(url)) {
    return <iframe title={title} className="aspect-video w-full rounded-2xl bg-black" src={`https://www.youtube-nocookie.com/embed/${yt(url)}?rel=0&modestbranding=1${startAt > 5 ? `&start=${Math.floor(startAt)}` : ''}`} allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
  }
  if (provider === 'vimeo' && vm(url)) {
    return <iframe title={title} className="aspect-video w-full rounded-2xl bg-black" src={`https://player.vimeo.com/video/${vm(url)}?dnt=1`} allow="fullscreen; picture-in-picture" allowFullScreen />;
  }
  if (provider === 'hls' && hlsUnsupported) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl bg-ink-900 p-6 text-center text-ink-200">
        <div><p className="font-semibold">This browser cannot play adaptive streams inline.</p><a className="mt-2 inline-flex items-center gap-1 text-brand-300 underline" href={url} target="_blank" rel="noopener noreferrer">Open the stream <ExternalLink className="h-4 w-4" /></a></div>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      key={url}
      src={url}
      title={title}
      className="aspect-video w-full rounded-2xl bg-black"
      controls
      playsInline
      preload="metadata"
      controlsList="nodownload"
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        v.playbackRate = readSpeed();
        if (startAt > 5 && startAt < v.duration - 10) v.currentTime = startAt;
      }}
      onRateChange={(e) => { try { localStorage.setItem(SPEED_KEY, String(e.currentTarget.playbackRate)); } catch { /* storage unavailable */ } }}
      onTimeUpdate={(e) => {
        const t = e.currentTarget.currentTime;
        if (Math.abs(t - last.current) >= 10) { last.current = t; onProgress?.(t); }
      }}
      onPause={(e) => onProgress?.(e.currentTarget.currentTime)}
      onEnded={() => onEnded?.()}
    />
  );
}
