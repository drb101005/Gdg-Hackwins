import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { InterviewsModule } from "./interviews/interviews.module";

@Module({
  imports: [AuthModule, InterviewsModule, AdminModule],
  controllers: [HealthController],
})
export class AppModule {}
