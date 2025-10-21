import { DomainRepository } from './domain.repository.js';
import { getDomainAnalytics } from './domain.analytics.js';
import { DomainAnalytics, DomainEntity, DomainRegistrationInput } from './domain.types.js';

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
