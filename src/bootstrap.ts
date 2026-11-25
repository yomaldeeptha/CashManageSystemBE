import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

export async function createNestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const rawOrigins = configService.get<string>('FRONTEND_URL') || 'http://localhost:3010,http://localhost:3000';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  // Trust Vercel / reverse-proxy headers so rate limiting & IP logging see real client IPs
  const expressApp = app.getHttpAdapter().getInstance();
  if (typeof expressApp?.set === 'function') {
    expressApp.set('trust proxy', 1);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  const isOriginAllowed = (origin: string): boolean => {
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalized)) return true;
    // Support explicit wildcard entries such as https://my-app-*.vercel.app
    return allowedOrigins.some((pattern) => {
      if (!pattern.includes('*') || pattern === '*') return false;
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+');
      return new RegExp(`^${escaped}$`).test(normalized);
    });
  };

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (
        !origin ||
        (!isProduction && allowedOrigins.includes('*')) ||
        isOriginAllowed(origin)
      ) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
  }
},
credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

app.setGlobalPrefix('api/v1');

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);

app.useGlobalFilters(new AllExceptionsFilter());
app.useGlobalInterceptors(new ResponseInterceptor());

if (!isProduction || configService.get<string>('ENABLE_SWAGGER') === 'true') {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('BNF Connect — Cash Management System API')
    .setDescription(
      'Enterprise REST API for Brew & Feast Cash Management System (Process 01 Cash Collection & Treasury, Process 02 Petty Cash & IOU Aging, Process 03 Sales Day-End Reconciliation, Process 04 Multi-Stage Approvals, 25 Master Data Catalogs, RBAC & Financial Reports).',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token obtained from POST /api/v1/auth/login',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

return app;
}
