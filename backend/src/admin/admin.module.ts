import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { InterviewsModule } from "../interviews/interviews.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [AuthModule, InterviewsModule],
  controllers: [AdminController],
})
export class AdminModule {}
