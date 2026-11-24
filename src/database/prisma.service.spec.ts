import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

describe('PrismaService append-only audit immutability', () => {
  it('blocks update and delete operations on ChangeLogs and AuditLogs on root client AND interactive $transaction', async () => {
    const prisma = new PrismaService();

    expect(() => (prisma.changeLog as any).update({ where: { id: 1 }, data: {} })).toThrow(
      ForbiddenException,
    );
    expect(() => (prisma.changeLog as any).delete({ where: { id: 1 } })).toThrow(
      ForbiddenException,
    );
    expect(() => (prisma.auditLog as any).deleteMany({})).toThrow(ForbiddenException);
    expect(() => (prisma.auditLog as any).upsert({ where: { id: 1 }, update: {}, create: {} })).toThrow(
      ForbiddenException,
    );

    // Verify interactive $transaction wrapper also locks tx delegates
    const fakeTx = {
      changeLog: {
        update: jest.fn(),
        updateMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      auditLog: {
        update: jest.fn(),
        updateMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    // Invoke private lockAuditDelegates directly on a simulated interactive tx client
    (prisma as any).lockAuditDelegates(fakeTx);
    expect(() => fakeTx.changeLog.update()).toThrow(ForbiddenException);
    expect(() => fakeTx.changeLog.deleteMany()).toThrow(ForbiddenException);
    expect(() => fakeTx.auditLog.delete()).toThrow(ForbiddenException);
    expect(() => fakeTx.auditLog.upsert()).toThrow(ForbiddenException);
  });
});
