export interface Item {
  id: number;
  name: string;
  description: string;
  category: string;
  createdAt: string;
}

export interface PaginationParams {
  offset: number;
  limit: number;
  filter?: string;
}

export interface PaginationMeta {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  selectedIds: number[];
}
