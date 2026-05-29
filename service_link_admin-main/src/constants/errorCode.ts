enum errorCode {
    SUCCESS = 1,
    EXCEPTION = 2,
    NOT_FOUND = 3,
    USERNAME_EXIST = 4,
    PHONE_EXIST = 5,
    EMAIL_EXIST = 6,
    ORDER_EXIST = 7,
    ORDER_DOSE_NOT_EXIST = 8,
    ROUTE_EXIST = 9,
    ROUTE_DOSE_NOT_EXIST = 10,
    ORDER_ASSIGNED = 11,
}

export default errorCode;