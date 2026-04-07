import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { InterviewsModule } from "./interviews/interviews.module";
import { TestingModule } from "./testing/testing.module";

@Module({
  imports: [AuthModule, InterviewsModule, AdminModule, TestingModule],
  controllers: [HealthController],
})
export class AppModule {}
