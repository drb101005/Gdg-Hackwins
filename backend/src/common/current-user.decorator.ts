import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "./auth-user";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
