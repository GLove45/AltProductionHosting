import { v4 as uuid } from 'uuid';
import { UserEntity, CreateUserInput } from './user.types.js';

const users: UserEntity[] = [];

export class UserRepository {
  async create(input: CreateUserInput): Promise<UserEntity> {
    const user: UserEntity = { id: uuid(), ...input, createdAt: new Date(), updatedAt: new Date() };
    users.push(user);
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    return users.find((user) => user.email === email);
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    return users.find((user) => user.id === id);
  }
}
