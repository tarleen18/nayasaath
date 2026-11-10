import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const role = process.env.ADMIN_ROLE || 'SUPER_ADMIN';
const allowed = ['SUPER_ADMIN', 'VERIFICATION_REVIEWER', 'SUPPORT', 'MODERATOR'];
if (!email || !password || password.length < 16 || !allowed.includes(role)) {
  console.error('Set ADMIN_EMAIL, ADMIN_PASSWORD (at least 16 characters), and optionally ADMIN_ROLE.');
  process.exit(1);
}
const prisma = new PrismaClient();
try {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, role, active: true },
    create: { email, passwordHash, role },
    select: { id: true, email: true, role: true, active: true },
  });
  console.log(`Admin account provisioned: ${admin.email} (${admin.role}).`);
} finally {
  await prisma.$disconnect();
}
