/**
 * Common types used across services
 */

/**
 * Request context passed from controller to service
 * Contains all request data (body, query, params, headers)
 */
export type RequestContext = {
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
};

/**
 * Generic list result structure for paginated responses
 */
export type ListGroup<T = any, M = Record<string, any>> = {
  key: string | number | null;
  label: string;
  count: number;
  items: T[];
  meta?: M;
};

export type ListResult<T = any, G extends ListGroup<T> = ListGroup<T>> = {
  data: T[];
  groupedData?: G[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
