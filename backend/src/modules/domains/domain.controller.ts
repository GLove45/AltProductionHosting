import { NextFunction, Request, Response } from 'express';
import { DomainService } from './domain.service.js';

export class DomainController {
  private service = new DomainService();

  async listDomains(req: Request, res: Response, next: NextFunction) {
    try {
      const domains = await this.service.listUserDomains(req.query.userId as string);
      res.json(domains);
    } catch (error) {
      next(error);
    }
  }

  async registerDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const domain = await this.service.registerDomain(req.body);
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
}
