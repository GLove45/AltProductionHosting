import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UserRepository } from '../users/user.repository.js';
import { RegisterPayload, AuthTokens, UserProfile, ChangePasswordPayload } from './auth.types.js';
import { UserEntity } from '../users/user.types.js';

export class AuthService {
  private users = new UserRepository();

  async registerUser(payload: RegisterPayload): Promise<UserProfile> {
    const existingByEmail = await this.users.findByEmail(payload.email);
    if (existingByEmail) {
      throw new Error('Email already in use');
    }

    const existingByUsername = await this.users.findByUsername(payload.username);
    if (existingByUsername) {
      throw new Error('Username already in use');
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const user = await this.users.create({
      email: payload.email,
      username: payload.username,
      password: hashedPassword,
      plan: payload.plan,
      storageLimitGb: payload.storageLimitGb
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan,
      storageLimitGb: user.storageLimitGb,
      role: user.role
    };
  }

  async login(identifier: string, password: string): Promise<AuthTokens> {
    const user =
      (await this.users.findByEmail(identifier)) ?? (await this.users.findByUsername(identifier));
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const accessToken = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ sub: user.id, type: 'refresh' }, env.jwtSecret, { expiresIn: '30d' });

    return { accessToken, refreshToken };
  }

  private async getUserFromToken(authorizationHeader: string): Promise<UserEntity> {
    const token = authorizationHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Authorization header missing');
    }

    const decoded = jwt.verify(token, env.jwtSecret) as { sub: string };
    const user = await this.users.findById(decoded.sub);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async getProfile(authorizationHeader: string): Promise<UserProfile> {
    const user = await this.getUserFromToken(authorizationHeader);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan,
      storageLimitGb: user.storageLimitGb,
      role: user.role
    };
  }

  async changePassword(
    authorizationHeader: string,
    payload: ChangePasswordPayload
  ): Promise<UserProfile> {
    const user = await this.getUserFromToken(authorizationHeader);

    const isValid = await bcrypt.compare(payload.currentPassword, user.password);
    if (!isValid) {
      throw new Error('Invalid current password');
    }

    const hashedPassword = await bcrypt.hash(payload.newPassword, 10);
    const updated = await this.users.updatePassword(user.id, hashedPassword);

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      plan: updated.plan,
      storageLimitGb: updated.storageLimitGb,
      role: updated.role
    };
  }
}
