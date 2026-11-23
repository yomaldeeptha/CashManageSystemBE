import { Module } from '@nestjs/common';
import { CashDepositController } from './cash-deposit.controller';
import { CashDepositService } from './cash-deposit.service';

@Module({
  controllers: [CashDepositController],
  providers: [CashDepositService],
  exports: [CashDepositService],
})
export class CashDepositModule {}
