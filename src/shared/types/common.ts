/**
 * Common utility types used across the application
 */

// Utility type for making specific properties required
export type RequireFields<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Utility type for making specific properties optional
export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Utility type for making all properties optional except those specified
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> &
  Pick<T, K>;

// Utility type for pagination
export interface Pagination {
  page: number;
  limit: number;
  total?: number;
}

// Utility type for API responses
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: Pagination;
}

// Result type with success or error
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

export interface FileWithPreview {
  file: File;
  preview: string;
  selected: boolean;
  id: string;
}
