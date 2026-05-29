enum userTokenType {
    FORGOT_PASSWORD = 1,
    REGISTE = 2,
    VERIFY_EMAIL = 3,
    SECURITY = 4,
}

enum faqType {
    TECHNICAL = 1,
    ACCOUNT_PURCHASE = 2,
    GAME_PLAY = 3,
    OTHER = 4,
}


enum guideType {
    RECENT_UPDATEDS = 1,
    BASIC_GUIDE = 2,
    SPEC_UP_GUIDE = 3,
}


const newsType = {
    COLLECTIONS: 1,
    NEW_ARRIVALS: 2
}


enum addressType {
    HOME = 1,
    APARTMENT = 2,
    OFFICE = 3,
}

const noneDefault = {
    NONE_DESC: "None",
    NONE: "NONE",
}

const sortBy = {
    LATEST: 1,
    LOW_TO_HIGH: 2,
    HIGH_TO_LOW: 3,
}

const paymentType = {
    COD: 1,
    VISA: 2,
    KCP: 3,
}

const paymentTypeText = {
    COD: 'COD',
    VISA: 'VISA',
    KCP: 'KCP',
}



export { userTokenType, noneDefault, faqType, guideType, newsType, addressType, sortBy, paymentType, paymentTypeText }