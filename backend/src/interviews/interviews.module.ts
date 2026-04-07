import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LocalSttModule } from "../local-stt/local-stt.module";
import { InterviewsController } from "./interviews.controller";
import { InterviewsService } from "./interviews.service";

@Module({
  imports: [AuthModule, LocalSttModule],
  controllers: [InterviewsController],
  providers: [InterviewsService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
