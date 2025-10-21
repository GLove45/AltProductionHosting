import { HostingRepository } from './hosting.repository.js';
import { HostingSpace, CreateSpaceInput, HostingFile, FileUploadInput } from './hosting.types.js';

export class HostingService {
  private repository = new HostingRepository();

  async listSpaces(userId: string): Promise<HostingSpace[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return this.repository.findByUserId(userId);
  }

  async createSpace(input: CreateSpaceInput): Promise<HostingSpace> {
    return this.repository.createSpace(input);
  }

  async getSpace(spaceId: string): Promise<HostingSpace> {
    const space = await this.repository.findById(spaceId);
    if (!space) {
      throw new Error('Space not found');
    }

    return space;
  }

  async uploadFile(spaceId: string, input: FileUploadInput): Promise<HostingFile> {
    return this.repository.createFile(spaceId, input);
  }

  async deleteFile(spaceId: string, fileId: string): Promise<void> {
    await this.repository.deleteFile(spaceId, fileId);
  }
}
