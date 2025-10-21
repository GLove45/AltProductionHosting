export type UserRole = 'admin' | 'member';

export interface CreateUserInput {
  id?: string;
  email: string;
  username: string;
  password: string;
  plan: string;
  storageLimitGb: number;
  role?: UserRole;
}

export interface UserEntity extends Omit<CreateUserInput, 'id'> {
  id: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
