import { NextFunction, Request, Response } from 'express';
import { HostingService } from './hosting.service.js';

export class HostingController {
  private service = new HostingService();

  async listSpaces(req: Request, res: Response, next: NextFunction) {
    try {
      const spaces = await this.service.listSpaces(req.query.userId as string);
      res.json(spaces);
    } catch (error) {
      next(error);
    }
  }

  async createSpace(req: Request, res: Response, next: NextFunction) {
    try {
      const space = await this.service.createSpace(req.body);
      res.status(201).json(space);
    } catch (error) {
      next(error);
    }
  }

  async getSpace(req: Request, res: Response, next: NextFunction) {
    try {
      const space = await this.service.getSpace(req.params.spaceId);
      res.json(space);
    } catch (error) {
      next(error);
    }
  }

  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      const file = await this.service.uploadFile(req.params.spaceId, req.body);
      res.status(201).json(file);
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      await this.service.deleteFile(req.params.spaceId, req.params.fileId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
