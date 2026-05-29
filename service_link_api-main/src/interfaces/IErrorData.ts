interface IErrorData {
    code: number,
    message: string,
    data?: any,
    /** Optional structured debug info (Postgres codes, query context, etc.) */
    details?: Record<string, unknown>,
}
export {IErrorData }