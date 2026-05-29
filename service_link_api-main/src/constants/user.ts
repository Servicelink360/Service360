enum userStatus {
    ACTIVE = 1,
    PENDING,
    REJECT,
    DELETE,
}

enum userType {
    ADMIN=3,
    STAFF=2,
    CUSTOMER=1,
}

/** Who must act next on an in-progress report fault (not the same as userType). */
const reportFaultSender = {
    CUSTOMER: 1,
    STAFF: 2,
    ADMIN: 3,
} as const;

export  { userStatus, userType, reportFaultSender }