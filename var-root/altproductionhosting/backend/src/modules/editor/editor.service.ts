import { EditorRepository } from './editor.repository.js';
import {
  EditorTemplate,
  EditorDraft,
  EditorDraftInput,
  PublishInput,
  PublishResult
} from './editor.types.js';

export class EditorService {
  private repository = new EditorRepository();

  async listTemplates(): Promise<EditorTemplate[]> {
    return this.repository.listTemplates();
  }

  async saveDraft(input: EditorDraftInput): Promise<EditorDraft> {
    return this.repository.saveDraft(input);
  }

  async publishSite(input: PublishInput): Promise<PublishResult> {
    return this.repository.publish(input);
  }
}
