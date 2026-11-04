interface IErrorData {
    code: number,
    message: string,
    data?: any,
    /** Optional structured debug info (Postgres codes, query context, etc.) */
    details?: Record<string, unknown>,
    /** Consumables / mail: true when record saved but Brevo send failed */
    emailFailed?: boolean,
}
export {IErrorData }