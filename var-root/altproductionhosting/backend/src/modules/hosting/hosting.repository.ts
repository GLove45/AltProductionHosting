import { v4 as uuid } from 'uuid';
import { HostingSpace, CreateSpaceInput, HostingFile, FileUploadInput } from './hosting.types.js';

const seedSpaces: HostingSpace[] = [
  {
    id: 'demo-space-1',
    userId: 'demo-user',
    domainId: 'demo-domain-1',
    name: 'Marketing Website',
    storageUsedMb: 186,
    storageLimitMb: 2048,
    files: [
      {
        id: 'demo-file-1',
        name: 'index.html',
        path: '/public',
        sizeMb: 1.2,
        contentType: 'text/html',
        createdAt: new Date('2024-02-12T09:00:00Z'),
        updatedAt: new Date('2024-04-05T11:30:00Z')
      },
      {
        id: 'demo-file-2',
        name: 'hero-video.mp4',
        path: '/public/media',
        sizeMb: 142,
        contentType: 'video/mp4',
        createdAt: new Date('2024-03-01T10:12:00Z'),
        updatedAt: new Date('2024-05-12T15:45:00Z')
      },
      {
        id: 'demo-file-3',
        name: 'pricing.json',
        path: '/data',
        sizeMb: 0.4,
        contentType: 'application/json',
        createdAt: new Date('2024-04-20T08:25:00Z'),
        updatedAt: new Date('2024-05-10T10:10:00Z')
      }
    ],
    createdAt: new Date('2023-09-18T10:00:00Z'),
    updatedAt: new Date('2024-05-18T13:10:00Z')
  },
  {
    id: 'demo-space-2',
    userId: 'demo-user',
    domainId: 'demo-domain-2',
    name: 'Developer Portal',
    storageUsedMb: 92,
    storageLimitMb: 1024,
    files: [
      {
        id: 'demo-file-4',
        name: 'docs.md',
        path: '/content',
        sizeMb: 0.8,
        contentType: 'text/markdown',
        createdAt: new Date('2024-01-10T11:00:00Z'),
        updatedAt: new Date('2024-05-16T09:05:00Z')
      },
      {
        id: 'demo-file-5',
        name: 'workflow-diagram.svg',
        path: '/public/assets',
        sizeMb: 2.4,
        contentType: 'image/svg+xml',
        createdAt: new Date('2024-02-08T10:15:00Z'),
        updatedAt: new Date('2024-04-29T08:48:00Z')
      }
    ],
    createdAt: new Date('2024-01-04T08:00:00Z'),
    updatedAt: new Date('2024-05-18T11:45:00Z')
  },
  {
    id: 'demo-space-3',
    userId: 'demo-user',
    domainId: 'demo-domain-3',
    name: 'Labs Preview',
    storageUsedMb: 24,
    storageLimitMb: 512,
    files: [
      {
        id: 'demo-file-6',
        name: 'preview.html',
        path: '/public',
        sizeMb: 0.6,
        contentType: 'text/html',
        createdAt: new Date('2024-05-20T10:00:00Z'),
        updatedAt: new Date('2024-05-22T07:10:00Z')
      }
    ],
    createdAt: new Date('2024-05-20T07:00:00Z'),
    updatedAt: new Date('2024-05-22T07:10:00Z')
  }
];

const spaces: HostingSpace[] = [...seedSpaces];

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
