import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ passReqToCallback: true })
  }
  async validate(req, username: string, password: string) {
    const user = await this.authService.validateUser(username, password, req.body.type, req.body.version);
    if (!user || typeof user === 'object' && 'error' in user && (user as { error?: string }).error) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
