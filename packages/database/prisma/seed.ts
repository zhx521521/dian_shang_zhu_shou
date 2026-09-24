import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all(
    [
      ['operator', '运营人员'],
      ['supervisor', '运营主管'],
      ['admin', '系统管理员'],
    ].map(([code, name]) =>
      prisma.role.upsert({ where: { code }, update: { name }, create: { code, name } }),
    ),
  );

  const passwordHash = await hash('Demo@123456', 12);
  const users = await Promise.all(
    [
      ['operator', '运营演示账号', 'operator'],
      ['supervisor', '主管演示账号', 'supervisor'],
      ['admin', '管理员演示账号', 'admin'],
    ].map(async ([username, displayName, roleCode]) => {
      const user = await prisma.user.upsert({
        where: { username },
        update: { displayName, active: true },
        create: { username, displayName, passwordHash },
      });
      const role = roles.find((item) => item.code === roleCode)!;
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
      return user;
    }),
  );

  const admin = users.find((user) => user.username === 'admin')!;
  const shop = await prisma.shop.upsert({
    where: { code: 'DEMO-TMALL' },
    update: {},
    create: {
      platform: 'tmall',
      code: 'DEMO-TMALL',
      name: '演示旗舰店',
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  await Promise.all(
    users.map((user) =>
      prisma.shopUserPermission.upsert({
        where: { shopId_userId: { shopId: shop.id, userId: user.id } },
        update: { canWrite: true },
        create: { shopId: shop.id, userId: user.id, canWrite: true },
      }),
    ),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
