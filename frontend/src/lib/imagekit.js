import { get } from './api.js';

/** Direct browser -> ImageKit upload using server-signed params. Returns the file URL. */
export async function uploadImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB');
  const { data: auth } = await get('/admin/upload-auth');
  const form = new FormData();
  form.append('file', file);
  form.append('fileName', file.name);
  form.append('publicKey', auth.publicKey);
  form.append('signature', auth.signature);
  form.append('expire', auth.expire);
  form.append('token', auth.token);
  form.append('folder', auth.folder);
  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Upload failed');
  return json.url;
}

/** ImageKit URL transform helper (no-op for non-ImageKit URLs). */
export const ik = (url, w = 400) => (url && url.includes('ik.imagekit.io') ? `${url}${url.includes('?') ? '&' : '?'}tr=w-${w},q-80,f-auto` : url);
