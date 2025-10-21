import { NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service.js';

export class AuthController {
  private service = new AuthService();

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.registerUser(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.login(req.body.email, req.body.password);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async profile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.getProfile(req.headers.authorization ?? '');
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
