export interface PageParams {
  page: number;
  limit: number;
}

export function parsePageParams(query: Record<string, unknown>, defaultLimit = 20, maxLimit = 100): PageParams {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), maxLimit) : defaultLimit;
  return { page, limit };
}

export function buildMeta(total: number, { page, limit }: PageParams) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
