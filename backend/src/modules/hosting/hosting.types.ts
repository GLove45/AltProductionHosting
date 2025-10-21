export interface CreateSpaceInput {
  userId: string;
  domainId: string;
  name: string;
  storageLimitMb: number;
}

export interface FileUploadInput {
  name: string;
  path: string;
  sizeMb: number;
  contentType: string;
}

export interface HostingFile extends FileUploadInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HostingSpace {
  id: string;
  userId: string;
  domainId: string;
  name: string;
  storageLimitMb: number;
  storageUsedMb: number;
  files: HostingFile[];
  createdAt: Date;
  updatedAt: Date;
}
