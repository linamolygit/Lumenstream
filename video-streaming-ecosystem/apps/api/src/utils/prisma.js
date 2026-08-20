import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && !dbUrl.includes('connection_limit')) {
  const joiner = dbUrl.includes('?') ? '&' : '?';
  dbUrl = `${dbUrl}${joiner}connection_limit=10&pool_timeout=20`;
}

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
