import { v4 as uuid } from 'uuid';
import { HostingSpace, CreateSpaceInput, HostingFile, FileUploadInput } from './hosting.types.js';

const spaces: HostingSpace[] = [];

export class HostingRepository {
  async findByUserId(userId: string): Promise<HostingSpace[]> {
    return spaces.filter((space) => space.userId === userId);
  }

  async createSpace(input: CreateSpaceInput): Promise<HostingSpace> {
    const space: HostingSpace = {
      id: uuid(),
      userId: input.userId,
      domainId: input.domainId,
      name: input.name,
      storageUsedMb: 0,
      storageLimitMb: input.storageLimitMb,
      files: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    spaces.push(space);
    return space;
  }

  async findById(spaceId: string): Promise<HostingSpace | undefined> {
    return spaces.find((space) => space.id === spaceId);
  }

  async createFile(spaceId: string, input: FileUploadInput): Promise<HostingFile> {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      throw new Error('Space not found');
    }

    if (space.storageUsedMb + input.sizeMb > space.storageLimitMb) {
      throw new Error('Storage limit exceeded');
    }

    const file: HostingFile = {
      id: uuid(),
      name: input.name,
      path: input.path,
      sizeMb: input.sizeMb,
      contentType: input.contentType,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    space.files.push(file);
    space.storageUsedMb += input.sizeMb;
    space.updatedAt = new Date();

    return file;
  }

  async deleteFile(spaceId: string, fileId: string): Promise<void> {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      throw new Error('Space not found');
    }

    const index = space.files.findIndex((file) => file.id === fileId);
    if (index === -1) {
      throw new Error('File not found');
    }

    const [file] = space.files.splice(index, 1);
    space.storageUsedMb -= file.sizeMb;
    space.updatedAt = new Date();
  }
}
