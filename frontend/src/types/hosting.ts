export type HostingFile = {
  id: string;
  name: string;
  path: string;
  sizeMb: number;
  contentType: string;
  createdAt: string;
  updatedAt: string;
};

export type HostingSpace = {
  id: string;
  userId: string;
  domainId: string;
  name: string;
  storageLimitMb: number;
  storageUsedMb: number;
  files: HostingFile[];
  createdAt: string;
  updatedAt: string;
};
