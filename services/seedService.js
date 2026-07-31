import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { fileURLToPath } from 'url';

// Hash password helper
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// ============================================
// Seed Admin Users (Development Only)
// ============================================
export const seedAdmins = async () => {
  if (process.env.NODE_ENV !== 'development') {
    return { success: false, message: 'Only available in development' };
  }

  try {
    const admins = [
      {
        email: 'admin@registry.edu.gh',
        password: 'Admin123!',
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
      },
    ];

    const results = [];
    for (const admin of admins) {
      const existing = await prisma.user.findUnique({
        where: { email: admin.email },
      });

      if (!existing) {
        const hashedPassword = await hashPassword(admin.password);
        await prisma.user.create({
          data: {
            email: admin.email,
            password: hashedPassword,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            isActive: true,
          },
        });
        results.push({ 
          email: admin.email, 
          password: admin.password,
          created: true 
        });
      } else {
        results.push({ 
          email: admin.email, 
          created: false, 
          message: 'Already exists' 
        });
      }
    }

    return { 
      success: true, 
      results,
      message: 'Admin user seeded successfully!'
    };
  } catch (error) {
    console.error('Seed error:', error);
    return { success: false, message: 'Failed to seed admin' };
  }
};

// ============================================
// Run directly: node services/seedService.js
// ============================================
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  seedAdmins()
    .then((result) => {
      console.log(result);
    })
    .catch((error) => {
      console.error('Fatal seed error:', error);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}