import { v4 as uuid } from 'uuid';
import {
  EditorDraft,
  EditorDraftInput,
  EditorTemplate,
  PublishInput,
  PublishResult
} from './editor.types.js';

const templates: EditorTemplate[] = [
  {
    id: 'classic-landing',
    name: 'Classic Landing Page',
    description: 'Hero banner, features grid, testimonials, and CTA layout',
    widgets: ['Hero', 'FeatureGrid', 'Testimonials', 'CallToAction']
  },
  {
    id: 'portfolio',
    name: 'Portfolio Showcase',
    description: 'Image gallery with about and contact sections',
    widgets: ['Gallery', 'About', 'ContactForm']
  }
];

const drafts: EditorDraft[] = [];

export class EditorRepository {
  async listTemplates(): Promise<EditorTemplate[]> {
    return templates;
  }

  async saveDraft(input: EditorDraftInput): Promise<EditorDraft> {
    const draft: EditorDraft = {
      id: uuid(),
      userId: input.userId,
      spaceId: input.spaceId,
      data: input.data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    drafts.push(draft);
    return draft;
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    // Stub: connect to deployment pipeline that persists draft to hosting space.
    return {
      spaceId: input.spaceId,
      publishedVersionId: uuid(),
      publishedAt: new Date(),
      status: 'queued'
    };
  }
}
