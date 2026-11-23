import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV = 'development';

  @IsOptional()
  @IsInt()
  @Min(1)
  PORT = 4000;

  @IsString()
  @MinLength(10)
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DATABASE_URL_UNPOOLED?: string;

  @IsOptional()
  @IsString()
  DIRECT_URL?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL = 'http://localhost:3010,http://localhost:3000';

  @IsString()
  @MinLength(16)
  ACCESS_TOKEN_SECRET!: string;

  @IsOptional()
  @IsString()
  ACCESS_TOKEN_EXPIRES_IN = '15m';

  @IsString()
  @MinLength(16)
  REFRESH_TOKEN_SECRET!: string;

  @IsOptional()
  @IsString()
  REFRESH_TOKEN_EXPIRES_IN = '7d';

  @IsOptional()
  @IsString()
  UPLOAD_DIR = './uploads';

  @IsOptional()
  @IsInt()
  @Min(1024)
  MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const normalized: Record<string, unknown> = {
    ...config,
    PORT: config.PORT ? Number(config.PORT) : 4000,
    MAX_UPLOAD_SIZE_BYTES: config.MAX_UPLOAD_SIZE_BYTES
      ? Number(config.MAX_UPLOAD_SIZE_BYTES)
      : 10 * 1024 * 1024,
  };

  if (normalized.NODE_ENV === 'test') {
    normalized.DATABASE_URL =
      normalized.DATABASE_URL || 'postgresql://test:test@localhost:5432/cms_test';
    normalized.ACCESS_TOKEN_SECRET =
      normalized.ACCESS_TOKEN_SECRET || 'test-access-secret-minimum-32-characters-long';
    normalized.REFRESH_TOKEN_SECRET =
      normalized.REFRESH_TOKEN_SECRET || 'test-refresh-secret-minimum-32-characters-long';
  }

  const validated = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((err) => `${err.property}: ${Object.values(err.constraints || {}).join(', ')}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return validated;
}
