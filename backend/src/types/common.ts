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
export type ListResult<T = any> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
