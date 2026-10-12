export const ok = (res, data = null, message = 'OK', meta) =>
  res.status(200).json({ success: true, message, data, ...(meta ? { meta } : {}) });
export const created = (res, data = null, message = 'Created') =>
  res.status(201).json({ success: true, message, data });
export const noContent = (res) => res.status(204).end();
