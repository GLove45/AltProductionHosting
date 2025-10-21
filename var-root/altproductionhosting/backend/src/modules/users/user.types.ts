export interface CreateUserInput {
  email: string;
  password: string;
  plan: string;
  storageLimitGb: number;
}

export interface UserEntity extends CreateUserInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
