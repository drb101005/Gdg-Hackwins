import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = String(request.headers.authorization || "");
    const match = header.match(/^Bearer (.+)$/i);

    if (!match) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    request.user = await this.authService.verifyToken(match[1]);
    return true;
  }
}
