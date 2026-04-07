import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TestingController } from "./testing.controller";

@Module({
  imports: [AuthModule],
  controllers: [TestingController],
})
export class TestingModule {}
