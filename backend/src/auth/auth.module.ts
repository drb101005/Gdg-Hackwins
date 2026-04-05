import { Module } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  controllers: [AuthController],
  providers: [DatabaseService, AuthService, JwtAuthGuard],
  exports: [DatabaseService, AuthService, JwtAuthGuard],
})
export class AuthModule {}
