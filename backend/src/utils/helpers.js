import crypto from 'crypto';

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
export const hmac = (secret, s) => crypto.createHmac('sha256', secret).update(String(s)).digest('hex');
export const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const slugify = (s = '') => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
export const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const genCode = (prefix, len = 8) => `${prefix}-${crypto.randomBytes(8).toString('hex').toUpperCase().slice(0, len)}`;
export const uniq = (arr) => [...new Set(arr.map(String))];

/** Short random suffix for slug collisions, e.g. "react-masterclass-x7k2" */
export const slugWithSuffix = (base) => `${slugify(base)}-${crypto.randomBytes(2).toString('hex')}`;

export const formatDuration = (sec = 0) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

export const formatDate = (d) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d));
