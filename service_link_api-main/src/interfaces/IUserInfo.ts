interface IUserJWT {
    sub: number;
    iat: number;
    exp: number;
    username: string;
    userId: number;
    fullName: string;
    email: string;
    type: number;
    roleIds: string[];
    companyId: string;
    departmentId:string,
    positionId:string,
}


interface IUserInfo {
    username: string;
    userId: number;
    fullName: string;
    email: string;
    type: number;
    companyId: string;
    departmentId:string,
    positionId:string,
    roleIds: string[];
}

export { IUserInfo, IUserJWT }