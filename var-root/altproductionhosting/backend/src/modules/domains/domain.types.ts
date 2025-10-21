export type DomainRegistrarProvider = 'internal' | 'namecheap' | 'cloudflare';

export type DomainStatus = 'pending-verification' | 'active' | 'suspended';

export interface DomainRegistrationInput {
  domainName: string;
  userId: string;
  registrarProvider: DomainRegistrarProvider;
}

export interface DomainEntity {
  id: string;
  name: string;
  userId: string;
  registrarProvider: DomainRegistrarProvider;
  status: DomainStatus;
  verificationToken: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
}

export type SeoIssueSeverity = 'critical' | 'warning' | 'notice';

export interface DomainSeoIssue {
  id: string;
  title: string;
  severity: SeoIssueSeverity;
  description: string;
  recommendation: string;
  impact: string;
  affectedPages: number;
}

export interface DomainSeoKeywordRanking {
  keyword: string;
  position: number;
  change: number;
  url: string;
  searchVolume: number;
  difficulty: number;
}

export interface DomainSeoBacklinkProfile {
  totalBacklinks: number;
  referringDomains: number;
  authorityScore: number;
  newLast30Days: number;
  lostLast30Days: number;
  topAnchorTexts: string[];
}

export type DomainSeoActionStatus = 'todo' | 'in-progress' | 'completed';

export interface DomainSeoActionItem {
  id: string;
  title: string;
  status: DomainSeoActionStatus;
  priority: 'low' | 'medium' | 'high';
  owner: string;
  dueDate: string;
  impact: string;
}

export interface DomainSeoCompetitorBenchmark {
  domain: string;
  visibilityScore: number;
  keywordGap: number;
  backlinkGap: number;
  topKeyword: string;
}

export type DomainSeoStructuredStatus = 'valid' | 'warning' | 'error';

export interface DomainSeoStructuredData {
  schemaType: string;
  status: DomainSeoStructuredStatus;
  notes: string;
}

export interface DomainSeoLighthouseScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface DomainSeoInsights {
  healthScore: number;
  crawlabilityScore: number;
  pageSpeedScore: number;
  mobileUsabilityScore: number;
  lighthouse: DomainSeoLighthouseScore;
  issues: DomainSeoIssue[];
  keywordRankings: DomainSeoKeywordRanking[];
  backlinkProfile: DomainSeoBacklinkProfile;
  structuredData: DomainSeoStructuredData[];
  competitors: DomainSeoCompetitorBenchmark[];
  actionPlan: DomainSeoActionItem[];
  serpFeatures: string[];
  monitoringCapabilities: string[];
}

export interface DomainTrafficTotals {
  visits: number;
  uniqueVisitors: number;
  pages: number;
  hits: number;
  bandwidthMb: number;
  avgVisitDuration: string;
  bounceRate: number;
}

export interface DomainTrafficSource {
  source: string;
  visits: number;
  change: number;
  percentage: number;
}

export interface DomainTrafficDailyStat {
  date: string;
  visits: number;
  pages: number;
  bandwidthMb: number;
}

export interface DomainTrafficHourlyStat {
  hour: string;
  hits: number;
  visits: number;
}

export interface DomainTrafficTopPage {
  url: string;
  views: number;
  entryRate: number;
  exitRate: number;
}

export interface DomainTrafficKeyword {
  keyword: string;
  visits: number;
  position: number;
}

export interface DomainTrafficReferrer {
  source: string;
  visits: number;
  type: 'search' | 'social' | 'direct' | 'referral';
}

export interface DomainTrafficCountry {
  country: string;
  visits: number;
  bandwidthMb: number;
}

export interface DomainTrafficHttpStatus {
  code: string;
  description: string;
  count: number;
}

export interface DomainAwStatsOverview {
  period: {
    month: string;
    year: number;
  };
  totals: DomainTrafficTotals;
  trafficSources: DomainTrafficSource[];
  daily: DomainTrafficDailyStat[];
  hourly: DomainTrafficHourlyStat[];
  topPages: DomainTrafficTopPage[];
  topKeywords: DomainTrafficKeyword[];
  topReferrers: DomainTrafficReferrer[];
  topCountries: DomainTrafficCountry[];
  httpStatus: DomainTrafficHttpStatus[];
}

export interface DomainAnalytics {
  domainId: string;
  generatedAt: string;
  seo: DomainSeoInsights;
  awstats: DomainAwStatsOverview;
}
