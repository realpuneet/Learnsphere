import mongoose from 'mongoose';

/** Page based pagination (admin tables). */
export function pageParams(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
export const pageMeta = (total, page, limit) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });

/** Cursor pagination on _id (patient facing infinite lists). Sorted newest first. */
export async function cursorPaginate(Model, filter, { cursor, limit = 20, sort = -1, select, populate, lean = true } = {}) {
  const lim = Math.min(50, Math.max(1, Number(limit) || 20));
  const q = { ...filter };
  if (cursor && mongoose.isValidObjectId(cursor)) q._id = { ...(q._id || {}), [sort === -1 ? '$lt' : '$gt']: cursor };
  let query = Model.find(q).sort({ _id: sort }).limit(lim + 1);
  if (select) query = query.select(select);
  if (populate) query = query.populate(populate);
  if (lean) query = query.lean();
  const rows = await query;
  const hasMore = rows.length > lim;
  if (hasMore) rows.pop();
  return { items: rows, nextCursor: hasMore ? String(rows[rows.length - 1]._id) : null, hasMore };
}
