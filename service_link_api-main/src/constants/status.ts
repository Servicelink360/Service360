enum isValid {
    ACTIVE = 1,
    INACTIVE,
}


enum isConfirmed {
    ACTIVE = 1,
    PENDING,
}

enum emailVerification {
    YES = 1,
    NO,
}

enum available {
    NONE = 0,
    ACTIVE = 1,
    INACTIVE = 2,
}

const eStatus = {
    NONE: 0,
    YES: 1,
    NO: 2,
}


const taskStatus = {
    NONE: 0,
    COMPLETED: 1,
    NEW: 2,
    PENDING: 3,
    INPROGRESS: 4,
    DELAYED: 5,
}


const dJobStatus = {
    NEW: 0,
    COMPLETED: 1,
    PENDING: 2,
    INPROGRESS: 3,
    DELETED: 4,
}
const ticketStatus = {
    NEW: 0,
    COMPLETED: 1,
    PENDING: 2,
    INPROGRESS: 3,
}

const reportFaultStatus = {
    NEW: 0,
    COMPLETED: 1,
    PENDING: 2,
    INPROGRESS: 3,
    DELETED: 4,
}

export { isValid, isConfirmed, emailVerification, available, eStatus, taskStatus,dJobStatus ,reportFaultStatus,ticketStatus}