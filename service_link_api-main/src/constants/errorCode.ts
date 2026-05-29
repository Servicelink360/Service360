import { IErrorData } from "../interfaces/IErrorData";

const errorCode = {
    SUCCESS: <IErrorData>{ code: 1, message: 'Success' },
    EXCEPTION: <IErrorData>{ code: 2, message: 'There have been some errors' },
    NOT_FOUND: <IErrorData>{ code: 3, message: 'No data' },
    USERNAME_EXIST: <IErrorData>{ code: 4, message: 'Username already exists' },
    PHONE_EXIST: <IErrorData>{ code: 5, message: 'Phone already exists' },
    EMAIL_EXIST: <IErrorData>{ code: 6, message: 'Email already exists' },
    PASSWORD_NOT_MATCH: <IErrorData>{ code: 7, message: 'Password does not match' },
    CAN_NOT_DELETE: <IErrorData>{ code: 8, message: "Can't delete" },
    ACTIVATED: <IErrorData>{ code: 9, message: "Activated" },
    REGISTERED: <IErrorData>{ code: 10, message: "This account is already registered" },
    CODE_EXIST: <IErrorData>{ code: 11, message: 'Code already exists' },
    ACCOUNT_DOSE_NOT_EXIST: <IErrorData>{ code: 12, message: 'Unauthorized' },
    MAINTENANCE: <IErrorData>{ code: 13, message: 'Under maintenance' },
    FIELD_DOES_NOT_EXIST: <IErrorData>{ code: 14, message: 'Field does not exist' },
    CAN_NOT_DELETED: <IErrorData>{ code: 15, message: 'Data in use cannot be deleted' },
    TOKEN_EXPIRED: <IErrorData>{ code: 16, message: 'The token has expired' },
    TOKEN_WRONG: <IErrorData>{ code: 17, message: 'The OTP does not exist' },
    REVIEW_EXIST: <IErrorData>{ code: 18, message: 'Review already exists' },
    PRODUCT_EXIST: <IErrorData>{ code: 19, message: 'Review already exists' },
    NAME_EXIST: <IErrorData>{ code: 20, message: 'Name already exists' },
    SHIFT_EXIST: <IErrorData>{ code: 21, message: 'Shift already exists' },
    VALIDATION_ERROR: <IErrorData>{ code: 22, message: 'Validation error' },
};
export { errorCode }