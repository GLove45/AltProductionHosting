import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UserRepository } from '../users/user.repository.js';
import { RegisterPayload, AuthTokens, UserProfile } from './auth.types.js';

export class AuthService {
  private users = new UserRepository();

  async registerUser(payload: RegisterPayload): Promise<UserProfile> {
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const user = await this.users.create({
      email: payload.email,
      password: hashedPassword,
      plan: payload.plan,
      storageLimitGb: payload.storageLimitGb
    });

    return {
      id: user.id,
      email: user.email,
      plan: user.plan,
      storageLimitGb: user.storageLimitGb
    };
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.users.findByEmail(email);
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

  async getProfile(authorizationHeader: string): Promise<UserProfile> {
    const token = authorizationHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, env.jwtSecret) as { sub: string };
    const user = await this.users.findById(decoded.sub);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      plan: user.plan,
      storageLimitGb: user.storageLimitGb
    };
  }
}
