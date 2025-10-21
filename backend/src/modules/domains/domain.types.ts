export interface DomainRegistrationInput {
  domainName: string;
  userId: string;
  registrarProvider: 'internal' | 'namecheap' | 'cloudflare';
}

export interface DomainEntity {
  id: string;
  name: string;
  userId: string;
  registrarProvider: string;
  status: 'pending-verification' | 'active' | 'suspended';
  verificationToken: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
}
