import { NextFunction, Request, Response } from 'express';
import { DomainService } from './domain.service.js';
import { AuthService } from '../auth/auth.service.js';

export class DomainController {
  private service = new DomainService();
  private auth = new AuthService();

  async listDomains(req: Request, res: Response, next: NextFunction) {
    try {
      const authorization = req.headers.authorization ?? '';
      const userId = (req.query.userId as string) || (await this.auth.getProfile(authorization)).id;
      const domains = await this.service.listUserDomains(userId);
      res.json(domains);
    } catch (error) {
      next(error);
    }
  }

  async registerDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.auth.getProfile(req.headers.authorization ?? '');
      const domain = await this.service.registerDomainForUser(user.id, req.body);
      res.status(201).json(domain);
    } catch (error) {
      next(error);
    }
  }

  async getDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const domain = await this.service.getDomainById(req.params.id);
      res.json(domain);
    } catch (error) {
      next(error);
    }
  }

  async verifyDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const domain = await this.service.verifyDomain(req.params.id, req.body.token);
      res.json(domain);
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await this.service.getDomainAnalytics(req.params.id);
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }
}
