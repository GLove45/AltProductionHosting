import { v4 as uuid } from 'uuid';
import { UserEntity, CreateUserInput } from './user.types.js';

const users: UserEntity[] = [];

export class UserRepository {
  async create(input: CreateUserInput): Promise<UserEntity> {
    const now = new Date();
    const user: UserEntity = {
      id: input.id ?? uuid(),
      email: input.email,
      username: input.username,
      password: input.password,
      plan: input.plan,
      storageLimitGb: input.storageLimitGb,
      role: input.role ?? 'member',
      createdAt: now,
      updatedAt: now
    };
    users.push(user);
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    return users.find((user) => user.email === email);
  }

  async findByUsername(username: string): Promise<UserEntity | undefined> {
    return users.find((user) => user.username === username);
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    return users.find((user) => user.id === id);
  }

  async updatePassword(id: string, hashedPassword: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    user.password = hashedPassword;
    user.updatedAt = new Date();
    return user;
  }
}
