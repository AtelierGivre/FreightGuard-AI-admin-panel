/** Shared list pagination. Accepts limit/skip and also page for older clients. */

const MAX_LIMIT = 200;

const positiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const parsePagination = (query = {}, defaultLimit = 50) => {
  const limit = Math.min(positiveInt(query.limit, defaultLimit), MAX_LIMIT);
  const requestedPage = positiveInt(query.page, 1);
  const rawSkip = Number(query.skip);
  const skip =
    Number.isFinite(rawSkip) && rawSkip >= 0 ? Math.floor(rawSkip) : (requestedPage - 1) * limit;
  const page = Math.floor(skip / limit) + 1;

  return {
    limit,
    skip,
    page,
    meta: (total, extra = {}) => ({
      total,
      page,
      limit,
      skip,
      pages: Math.max(1, Math.ceil(total / limit)),
      ...extra,
    }),
  };
};

module.exports = { MAX_LIMIT, parsePagination };
