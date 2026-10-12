/** Tiny non-cryptographic string hash – used to derive idempotency keys from request payloads. */
export const hashKey = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
