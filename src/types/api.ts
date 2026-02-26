export type Primitive = string | number | boolean | null | undefined;
export type QueryValue = Primitive | Primitive[];
export type QueryParams = Record<string, QueryValue>;

export type ApiEnvelope<T> = {
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
};

export type PaginationMeta = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  from: number;
  to: number;
};
