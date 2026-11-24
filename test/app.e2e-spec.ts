import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('BNF Connect CMS REST API (HTTP E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let adminToken: string;
  let cashierToken: string;

  const adminDbUser = {
    id: 1,
    username: 'superadmin',
    fullName: 'Pramuditha Bandara',
    email: 'admin@brewfeast.mv',
    empNo: 'ADM-001',
    designation: 'System Administrator',
    roleId: 1,
    employeeId: 1,
    isActive: true,
    role: {
      code: 'ADM',
      name: 'System Administrator',
      permissions: [
        {
          moduleKey: 'auditExport',
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
          canApprove: true,
          canUnblock: true,
        },
      ],
    },
    companyAccess: [],
    branchAccess: [],
    outletAccess: [],
    departmentAccess: [],
    screenAuthorizations: [],
  };

  const cashierDbUser = {
    id: 2,
    username: 'ashujau',
    fullName: 'Ahmed Shujau',
    email: 'ashujau@brewfeast.mv',
    empNo: 'CSH-104',
    designation: 'Head Cashier',
    roleId: 5,
    employeeId: 2,
    isActive: true,
    role: {
      code: 'OUT-CSH',
      name: 'Outlet Cashier',
      permissions: [
        {
          moduleKey: 'auditExport',
          canRead: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          canApprove: false,
          canUnblock: false,
        },
      ],
    },
    companyAccess: [{ companyId: 1 }],
    branchAccess: [{ branchId: 1 }],
    outletAccess: [{ outletId: 1 }],
    departmentAccess: [{ departmentId: 1 }],
    screenAuthorizations: [],
  };

  const sampleLogRow = {
    id: 1,
    userId: 1,
    userName: 'Pramuditha Bandara (ADM-001)',
    action: 'UPDATE',
    tableName: 'Company',
    recordId: '1',
    recordCode: 'BF-MDV',
    oldValues: { name: 'Old Name' },
    newValues: { name: 'Brew & Feast Maldives Pvt Ltd' },
    changedFields: ['name'],
    description: 'Updated Name on Company (BF-MDV)',
    ipAddress: '127.0.0.1',
    userAgent: 'Supertest',
    createdAt: new Date('2026-11-23T10:00:00.000Z'),
    user: { id: 1, username: 'superadmin', fullName: 'Pramuditha Bandara', empNo: 'ADM-001' },
  };

  const mockPrisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id?: number } }) => {
        if (where.id === 1) return adminDbUser;
        if (where.id === 2) return cashierDbUser;
        return null;
      }),
    },
    changeLog: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([sampleLogRow]),
      findUnique: jest.fn().mockResolvedValue(sampleLogRow),
    },
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SKIP_PRISMA_CONNECT = 'true';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    jwtService = app.get(JwtService);
    const secret = process.env.ACCESS_TOKEN_SECRET || 'dev-fallback-secret';
    adminToken = jwtService.sign(
      { sub: 1, username: 'superadmin', roleCode: 'ADM' },
      { secret, expiresIn: '15m' },
    );
    cashierToken = jwtService.sign(
      { sub: 2, username: 'ashujau', roleCode: 'OUT-CSH' },
      { secret, expiresIn: '15m' },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns standardized success envelope with connected DB', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
  });

  it('POST /api/v1/auth/login validates DTO and returns structured 400 error on missing fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: '' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it('POST /api/v1/auth/login returns 401 for invalid credentials without leaking account existence', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'unknown', password: 'password123' })
      .expect(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid username or password.');
  });

  it('Protects private endpoints with JWT guard (401 when unauthenticated)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/cash-deposits').expect(401);
    expect(res.body.success).toBe(false);
  });

  describe('Audit & Change Logs Read-Only Security (Append-Only Enforcement)', () => {
    it('blocks unauthenticated access to GET /api/v1/audit-logs (401)', async () => {
      await request(app.getHttpServer()).get('/api/v1/audit-logs').expect(401);
    });

    it('blocks unauthorized users from global GET /api/v1/audit-logs (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('blocks unauthorized users from restricted admin entity record history (403) even with lowercase tableName', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/record/User/1')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);

      const lowerRes = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/record/user/1')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(403);
      expect(lowerRes.body.success).toBe(false);
    });

    it('allows authorized administrators to query global audit logs and record history (200)', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.meta.total).toBe(1);

      const detailRes = await request(app.getHttpServer())
        .get('/api/v1/audit-logs/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(detailRes.body.success).toBe(true);
      expect(detailRes.body.data.fieldDiffs).toHaveLength(1);
      expect(detailRes.body.data.fieldDiffs[0].field).toBe('name');
    });

    it('exposes ZERO create, update, or delete HTTP endpoints on /api/v1/audit-logs (404)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'CREATE' })
        .expect(404);

      await request(app.getHttpServer())
        .put('/api/v1/audit-logs/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Tampered' })
        .expect(404);

      await request(app.getHttpServer())
        .patch('/api/v1/audit-logs/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Tampered' })
        .expect(404);

      await request(app.getHttpServer())
        .delete('/api/v1/audit-logs/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
