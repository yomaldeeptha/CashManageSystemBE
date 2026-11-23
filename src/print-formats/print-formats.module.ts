import { Module } from '@nestjs/common';
import { PrintFormatsController } from './print-formats.controller';
import { PrintFormatsService } from './print-formats.service';

@Module({
  controllers: [PrintFormatsController],
  providers: [PrintFormatsService],
})
export class PrintFormatsModule {}
