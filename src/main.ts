import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createNestApp } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await createNestApp();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`BNF Connect CMS API running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger OpenAPI documentation available at http://localhost:${port}/api/docs`);
}

void bootstrap();
