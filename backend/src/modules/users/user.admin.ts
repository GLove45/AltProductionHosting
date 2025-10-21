import bcrypt from 'bcryptjs';
import { UserRepository } from './user.repository.js';
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_ID, DEFAULT_ADMIN_USERNAME } from './user.constants.js';

const ADMIN_DEFAULT_PASSWORD = 'Welcome1';

export const seedAdminUser = async () => {
  const repository = new UserRepository();
  const existing = await repository.findByUsername(DEFAULT_ADMIN_USERNAME);

  if (existing) {
    return existing;
  }

  const hashedPassword = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 10);

  return repository.create({
    id: DEFAULT_ADMIN_ID,
    email: DEFAULT_ADMIN_EMAIL,
    username: DEFAULT_ADMIN_USERNAME,
    password: hashedPassword,
    plan: 'enterprise',
    storageLimitGb: 500,
    role: 'admin'
  });
};
