import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let jwtService: { signAsync: jest.Mock };
  let auditService: { log: jest.Mock };
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('bnf@checker2026', 4);
  });

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      company: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) },
      branch: { findMany: jest.fn().mockResolvedValue([{ id: 1, companyId: 1 }]) },
      outlet: { findMany: jest.fn().mockResolvedValue([{ id: 1, branchId: 1 }]) },
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-jwt-token') };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'ACCESS_TOKEN_SECRET') return 'test-access-secret-minimum-32-characters';
        if (key === 'ACCESS_TOKEN_EXPIRES_IN') return '15m';
        if (key === 'REFRESH_TOKEN_EXPIRES_IN') return '7d';
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService,
      auditService as unknown as AuditService,
    );
  });

  it('rejects unknown username with generic invalid credentials error', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.login({ username: 'nobody', password: 'wrong' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid username or password.'));
  });

  it('rejects wrong password with the exact same generic error message', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 4,
      username: 'hshareef',
      isActive: true,
      passwordHash,
    });
    await expect(
      service.login({ username: 'hshareef', password: 'wrong-password' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid username or password.'));
  });

  it('issues JWT access token and stores hashed refresh token on valid login', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 4,
      username: 'hshareef',
      isActive: true,
      passwordHash,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 4,
      username: 'hshareef',
      fullName: 'Hassan Shareef',
      email: 'hshareef@brewfeast.mv',
      empNo: 'FIN-091',
      designation: 'Finance Checker',
      roleId: 3,
      employeeId: 4,
      isActive: true,
      role: { id: 3, code: 'FIN-CHK', name: 'Finance Checker', permissions: [] },
      userGroup: null,
      companyAccess: [{ companyId: 1 }],
      branchAccess: [{ branchId: 1 }],
      outletAccess: [{ outletId: 1 }],
      departmentAccess: [],
      screenAuthorizations: [],
    });

    const result = await service.login({ username: 'hshareef', password: 'bnf@checker2026' });

    expect(result.accessToken).toBe('signed-jwt-token');
    expect(result.refreshToken).toBeDefined();
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    const storedHash = prisma.refreshToken.create.mock.calls[0][0].data.tokenHash as string;
    expect(storedHash).not.toBe(result.refreshToken);
    expect(storedHash).toHaveLength(64); // SHA-256 hex digest
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN' }));
  });
});
