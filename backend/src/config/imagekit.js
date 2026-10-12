import ImageKit from 'imagekit';
import { env, features } from './env.js';

let instance;
export function getImageKit() {
  if (!features.imagekit) return null;
  if (!instance) {
    instance = new ImageKit({
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      privateKey: env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return instance;
}
