export interface PaginationMeta {
  count?: number;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface PagedResult<T> {
  items: T[];
  meta: PaginationMeta;
}
