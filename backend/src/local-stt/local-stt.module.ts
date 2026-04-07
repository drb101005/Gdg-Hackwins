import { Module } from "@nestjs/common";
import { LocalSttService } from "./local-stt.service";

@Module({
  providers: [LocalSttService],
  exports: [LocalSttService],
})
export class LocalSttModule {}
