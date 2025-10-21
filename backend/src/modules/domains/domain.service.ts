import { DomainRepository } from './domain.repository.js';
import { DomainEntity, DomainRegistrationInput } from './domain.types.js';

export class DomainService {
  private domains = new DomainRepository();

  async listUserDomains(userId: string): Promise<DomainEntity[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return this.domains.findByUserId(userId);
  }

  async registerDomain(input: DomainRegistrationInput): Promise<DomainEntity> {
    // Integrate with third-party registrar in production.
    return this.domains.register(input);
  }

  async getDomainById(id: string): Promise<DomainEntity | undefined> {
    return this.domains.findById(id);
  }

  async verifyDomain(id: string, token: string): Promise<DomainEntity> {
    return this.domains.verify(id, token);
  }
}
