import { DomainRepository } from './domain.repository.js';
import { getDomainAnalytics } from './domain.analytics.js';
import { DomainAnalytics, DomainEntity, DomainRegistrationInput } from './domain.types.js';
import { UserRepository } from '../users/user.repository.js';

export class DomainService {
  private domains = new DomainRepository();
  private users = new UserRepository();

  async listUserDomains(userId: string): Promise<DomainEntity[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return this.domains.findByUserId(userId);
  }

  async registerDomainForUser(
    userId: string,
    input: Omit<DomainRegistrationInput, 'userId'>
  ): Promise<DomainEntity> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'admin') {
      throw new Error('Only administrators can register new domains');
    }

    const payload: DomainRegistrationInput = {
      userId,
      domainName: input.domainName,
      registrarProvider: input.registrarProvider
    };

    return this.domains.register(payload);
  }

  async getDomainById(id: string): Promise<DomainEntity | undefined> {
    return this.domains.findById(id);
  }

  async verifyDomain(id: string, token: string): Promise<DomainEntity> {
    return this.domains.verify(id, token);
  }

  async getDomainAnalytics(domainId: string): Promise<DomainAnalytics> {
    const domain = await this.domains.findById(domainId);
    if (!domain) {
      throw new Error('Domain not found');
    }

    const analytics = getDomainAnalytics(domainId);
    if (!analytics) {
      throw new Error('Analytics not available for this domain');
    }

    return analytics;
  }
}
