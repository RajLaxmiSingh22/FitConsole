import Joi from "joi";

export const paginationKeys = {
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
};

// Returns null when no page is requested so existing callers keep receiving a plain array.
export function getPagination(query = {}) {
  if (query.page === undefined) return null;
  const limit = query.limit ?? 25;
  return { page: query.page, limit, offset: (query.page - 1) * limit };
}

export function paginatedData(rows, count, pagination) {
  if (!pagination) return rows;
  return {
    items: rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pagination.limit)),
    },
  };
}

// Escapes LIKE wildcards; PostgreSQL's default LIKE escape character is a backslash.
export function escapeLikePattern(value) {
  return String(value).replace(/[\\%_]/g, (character) => `\\${character}`);
}
