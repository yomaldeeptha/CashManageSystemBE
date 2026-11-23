import { Global, Module } from '@nestjs/common';
import { ExchangeRateResolverService } from './exchange-rate-resolver.service';
import { NumberSeriesGeneratorService } from './number-series-generator.service';

@Global()
@Module({
  providers: [ExchangeRateResolverService, NumberSeriesGeneratorService],
  exports: [ExchangeRateResolverService, NumberSeriesGeneratorService],
})
export class CommonServicesModule {}
