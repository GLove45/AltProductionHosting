export type DomainRegistrarProvider = 'internal' | 'namecheap' | 'cloudflare';

export type DomainStatus = 'pending-verification' | 'active' | 'suspended';

export type Domain = {
  id: string;
  name: string;
  userId: string;
  registrarProvider: DomainRegistrarProvider;
  status: DomainStatus;
  verificationToken: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
};

export type SeoIssueSeverity = 'critical' | 'warning' | 'notice';

export type DomainSeoIssue = {
  id: string;
  title: string;
  severity: SeoIssueSeverity;
  description: string;
  recommendation: string;
  impact: string;
  affectedPages: number;
};

export type DomainSeoKeywordRanking = {
  keyword: string;
  position: number;
  change: number;
  url: string;
  searchVolume: number;
  difficulty: number;
};

export type DomainSeoBacklinkProfile = {
  totalBacklinks: number;
  referringDomains: number;
  authorityScore: number;
  newLast30Days: number;
  lostLast30Days: number;
  topAnchorTexts: string[];
};

export type DomainSeoActionStatus = 'todo' | 'in-progress' | 'completed';

export type DomainSeoActionItem = {
  id: string;
  title: string;
  status: DomainSeoActionStatus;
  priority: 'low' | 'medium' | 'high';
  owner: string;
  dueDate: string;
  impact: string;
};

export type DomainSeoCompetitorBenchmark = {
  domain: string;
  visibilityScore: number;
  keywordGap: number;
  backlinkGap: number;
  topKeyword: string;
};

export type DomainSeoStructuredStatus = 'valid' | 'warning' | 'error';

export type DomainSeoStructuredData = {
  schemaType: string;
  status: DomainSeoStructuredStatus;
  notes: string;
};

export type DomainSeoLighthouseScore = {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
};

export type DomainSeoInsights = {
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
};

export type DomainTrafficTotals = {
  visits: number;
  uniqueVisitors: number;
  pages: number;
  hits: number;
  bandwidthMb: number;
  avgVisitDuration: string;
  bounceRate: number;
};

export type DomainTrafficSource = {
  source: string;
  visits: number;
  change: number;
  percentage: number;
};

export type DomainTrafficDailyStat = {
  date: string;
  visits: number;
  pages: number;
  bandwidthMb: number;
};

export type DomainTrafficHourlyStat = {
  hour: string;
  hits: number;
  visits: number;
};

export type DomainTrafficTopPage = {
  url: string;
  views: number;
  entryRate: number;
  exitRate: number;
};

export type DomainTrafficKeyword = {
  keyword: string;
  visits: number;
  position: number;
};

export type DomainTrafficReferrer = {
  source: string;
  visits: number;
  type: 'search' | 'social' | 'direct' | 'referral';
};

export type DomainTrafficCountry = {
  country: string;
  visits: number;
  bandwidthMb: number;
};

export type DomainTrafficHttpStatus = {
  code: string;
  description: string;
  count: number;
};

export type DomainAwStatsOverview = {
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
};

export type DomainAnalytics = {
  domainId: string;
  generatedAt: string;
  seo: DomainSeoInsights;
  awstats: DomainAwStatsOverview;
};
