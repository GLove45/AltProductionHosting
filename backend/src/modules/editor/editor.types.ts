export interface EditorTemplate {
  id: string;
  name: string;
  description: string;
  widgets: string[];
}

export interface EditorDraftInput {
  userId: string;
  spaceId: string;
  data: Record<string, unknown>;
}

export interface EditorDraft extends EditorDraftInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishInput {
  userId: string;
  spaceId: string;
  draftId: string;
}

export interface PublishResult {
  spaceId: string;
  publishedVersionId: string;
  publishedAt: Date;
  status: 'queued' | 'in-progress' | 'live';
}
