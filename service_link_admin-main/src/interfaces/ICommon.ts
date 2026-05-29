export interface SagaProps {
  type: string;
  payload: any;
}
export interface ListResponse<T> {
  code: number;
  count?: number;
  data?: any;
  message: string;
  /** Present on some API validation / HTTP error payloads */
  details?: {
    message?: string | string[];
    [key: string]: unknown;
  };
}