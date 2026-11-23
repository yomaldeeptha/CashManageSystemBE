import { Module } from '@nestjs/common';
import { SalesReconController } from './sales-recon.controller';
import { SalesReconService } from './sales-recon.service';

@Module({
  controllers: [SalesReconController],
  providers: [SalesReconService],
  exports: [SalesReconService],
})
export class SalesReconModule {}
