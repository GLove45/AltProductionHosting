import { v4 as uuid } from 'uuid';
import { DomainEntity, DomainRegistrationInput } from './domain.types.js';

const seedDomains: DomainEntity[] = [
  {
    id: 'demo-domain-1',
    name: 'altproductionsites.com',
    userId: 'demo-user',
    registrarProvider: 'internal',
    status: 'active',
    verificationToken: uuid(),
    createdAt: new Date('2023-09-18T10:00:00Z'),
    updatedAt: new Date('2024-05-01T14:30:00Z'),
    verifiedAt: new Date('2023-09-19T09:15:00Z')
  },
  {
    id: 'demo-domain-2',
    name: 'altproductionstudio.io',
    userId: 'demo-user',
    registrarProvider: 'cloudflare',
    status: 'active',
    verificationToken: uuid(),
    createdAt: new Date('2024-01-04T08:00:00Z'),
    updatedAt: new Date('2024-05-18T11:45:00Z'),
    verifiedAt: new Date('2024-01-05T16:20:00Z')
  },
  {
    id: 'demo-domain-3',
    name: 'altproductionlabs.dev',
    userId: 'demo-user',
    registrarProvider: 'namecheap',
    status: 'pending-verification',
    verificationToken: uuid(),
    createdAt: new Date('2024-05-22T07:10:00Z'),
    updatedAt: new Date('2024-05-22T07:10:00Z')
  }
];

const domains: DomainEntity[] = [...seedDomains];

export class DomainRepository {
  async register(input: DomainRegistrationInput): Promise<DomainEntity> {
    const entity: DomainEntity = {
      id: uuid(),
      name: input.domainName,
      userId: input.userId,
      status: 'pending-verification',
      registrarProvider: input.registrarProvider,
      verificationToken: uuid(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    domains.push(entity);
    return entity;
  }

  async findByUserId(userId: string): Promise<DomainEntity[]> {
    return domains.filter((domain) => domain.userId === userId);
  }

  async findById(id: string): Promise<DomainEntity | undefined> {
    return domains.find((domain) => domain.id === id);
  }

  async verify(id: string, token: string): Promise<DomainEntity> {
    const domain = domains.find((item) => item.id === id);
    if (!domain || domain.verificationToken !== token) {
      throw new Error('Invalid verification attempt');
    }

    domain.status = 'active';
    domain.verifiedAt = new Date();
    domain.updatedAt = new Date();
    return domain;
  }
}
