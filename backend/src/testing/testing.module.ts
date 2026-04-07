import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LocalSttModule } from "../local-stt/local-stt.module";
import { TestingController } from "./testing.controller";

@Module({
  imports: [AuthModule, LocalSttModule],
  controllers: [TestingController],
})
export class TestingModule {}
