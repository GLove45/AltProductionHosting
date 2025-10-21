import { NextFunction, Request, Response } from 'express';
import { EditorService } from './editor.service.js';

export class EditorController {
  private service = new EditorService();

  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const templates = await this.service.listTemplates();
      res.json(templates);
    } catch (error) {
      next(error);
    }
  }

  async saveDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const draft = await this.service.saveDraft(req.body);
      res.status(201).json(draft);
    } catch (error) {
      next(error);
    }
  }

  async publishSite(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.service.publishSite(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
