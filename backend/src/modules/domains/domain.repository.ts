import { v4 as uuid } from 'uuid';
import { DomainEntity, DomainRegistrationInput } from './domain.types.js';

const domains: DomainEntity[] = [];

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
