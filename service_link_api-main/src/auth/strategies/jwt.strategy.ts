import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import config from 'src/config';
import { IUserInfo } from '../../interfaces/IUserInfo';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.JWT_SECRET_KEY,
    });
  }

  async validate(payload: any) {
    return <IUserInfo>{
      userId: payload.sub,
      username: payload.username,
      email: payload.email,
      fullName: payload.full_name,
      type: payload.type,
      roleIds :payload.roleIds,
      companyId:payload.companyId,
      departmentId:payload.departmentId,
      positionId:payload.positionId,
    };
  }
}
