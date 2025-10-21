import { DomainAnalytics } from './domain.types.js';

const generatedAt = new Date('2024-05-25T12:00:00Z').toISOString();

export const domainAnalyticsStore: Record<string, DomainAnalytics> = {
  'demo-domain-1': {
    domainId: 'demo-domain-1',
    generatedAt,
    seo: {
      healthScore: 88,
      crawlabilityScore: 93,
      pageSpeedScore: 84,
      mobileUsabilityScore: 91,
      lighthouse: {
        performance: 89,
        accessibility: 94,
        bestPractices: 92,
        seo: 96
      },
      issues: [
        {
          id: 'issue-1',
          title: 'Canonical tag missing on /resources/blog',
          severity: 'warning',
          description: 'The page is indexable but lacks a canonical directive to consolidate link equity.',
          recommendation: 'Add a canonical tag referencing the preferred URL.',
          impact: 'Prevents dilution of ranking signals for duplicate content.',
          affectedPages: 3
        },
        {
          id: 'issue-2',
          title: 'Largest Contentful Paint above 3s on mobile',
          severity: 'critical',
          description: 'Hero imagery is not optimized and defers rendering on 4G networks.',
          recommendation: 'Serve responsive, compressed hero media via next-gen formats and lazy loading.',
          impact: 'Improving LCP can unlock a projected +8% conversion lift.',
          affectedPages: 4
        },
        {
          id: 'issue-3',
          title: 'Missing alt attributes across gallery assets',
          severity: 'notice',
          description: '12 decorative gallery images do not expose accessible alternate text.',
          recommendation: 'Add descriptive alt attributes or mark as decorative when appropriate.',
          impact: 'Supports accessibility compliance and Google image search indexing.',
          affectedPages: 12
        }
      ],
      keywordRankings: [
        {
          keyword: 'managed wordpress hosting',
          position: 7,
          change: 2,
          url: 'https://altproductionsites.com/managed-wordpress-hosting',
          searchVolume: 14800,
          difficulty: 61
        },
        {
          keyword: 'drag and drop site editor',
          position: 4,
          change: 1,
          url: 'https://altproductionsites.com/editor',
          searchVolume: 4400,
          difficulty: 38
        },
        {
          keyword: 'seo monitoring suite',
          position: 11,
          change: -1,
          url: 'https://altproductionsites.com/seo-suite',
          searchVolume: 2100,
          difficulty: 42
        },
        {
          keyword: 'digital experience analytics',
          position: 15,
          change: 5,
          url: 'https://altproductionsites.com/insights',
          searchVolume: 1300,
          difficulty: 54
        }
      ],
      backlinkProfile: {
        totalBacklinks: 1240,
        referringDomains: 238,
        authorityScore: 67,
        newLast30Days: 42,
        lostLast30Days: 11,
        topAnchorTexts: ['alt production hosting', 'drag-and-drop editor', 'performance reports']
      },
      structuredData: [
        {
          schemaType: 'Organization',
          status: 'valid',
          notes: 'Primary organization schema validated via Rich Results testing.'
        },
        {
          schemaType: 'FAQPage',
          status: 'warning',
          notes: 'One FAQ entry lacks an acceptedAnswer field.'
        }
      ],
      competitors: [
        {
          domain: 'stackedhosting.com',
          visibilityScore: 63,
          keywordGap: 78,
          backlinkGap: -120,
          topKeyword: 'wordpress hosting automation'
        },
        {
          domain: 'flowpress.net',
          visibilityScore: 58,
          keywordGap: 55,
          backlinkGap: 42,
          topKeyword: 'drag and drop builder'
        }
      ],
      actionPlan: [
        {
          id: 'action-1',
          title: 'Compress hero video and implement preloading strategy',
          status: 'in-progress',
          priority: 'high',
          owner: 'Performance Guild',
          dueDate: '2024-05-30',
          impact: 'Expected -1.8s LCP improvement across mobile templates.'
        },
        {
          id: 'action-2',
          title: 'Deploy FAQ schema fix via content hub',
          status: 'todo',
          priority: 'medium',
          owner: 'Content Operations',
          dueDate: '2024-06-03',
          impact: 'Restores FAQ rich result eligibility for 12 keywords.'
        },
        {
          id: 'action-3',
          title: 'Pitch co-marketing guest posts to high DA partners',
          status: 'in-progress',
          priority: 'medium',
          owner: 'Partnerships',
          dueDate: '2024-06-15',
          impact: '+35 referring domains projected in Q3.'
        }
      ],
      serpFeatures: ['Sitelinks', 'FAQ rich results', 'People also ask coverage'],
      monitoringCapabilities: [
        'Weekly site audit snapshots',
        'Automated keyword rank tracking (2x daily)',
        'Backlink velocity anomaly alerts',
        'Google Search Console and Analytics synchronisation',
        'Competitor gap analysis refresh every Monday'
      ]
    },
    awstats: {
      period: {
        month: 'May',
        year: 2024
      },
      totals: {
        visits: 48210,
        uniqueVisitors: 37280,
        pages: 183420,
        hits: 263110,
        bandwidthMb: 9184,
        avgVisitDuration: '00:04:12',
        bounceRate: 37.5
      },
      trafficSources: [
        { source: 'Organic search', visits: 26820, change: 6.3, percentage: 55.6 },
        { source: 'Direct', visits: 11240, change: 3.2, percentage: 23.3 },
        { source: 'Referral', visits: 6540, change: 1.9, percentage: 13.6 },
        { source: 'Paid campaigns', visits: 2360, change: -0.8, percentage: 4.9 },
        { source: 'Social', visits: 1250, change: 2.1, percentage: 2.6 }
      ],
      daily: [
        { date: '2024-05-19', visits: 1380, pages: 5620, bandwidthMb: 178 },
        { date: '2024-05-20', visits: 2140, pages: 8340, bandwidthMb: 265 },
        { date: '2024-05-21', visits: 2320, pages: 9020, bandwidthMb: 288 },
        { date: '2024-05-22', visits: 2455, pages: 9215, bandwidthMb: 295 },
        { date: '2024-05-23', visits: 2380, pages: 9070, bandwidthMb: 284 },
        { date: '2024-05-24', visits: 2525, pages: 9480, bandwidthMb: 301 },
        { date: '2024-05-25', visits: 2605, pages: 9720, bandwidthMb: 308 }
      ],
      hourly: [
        { hour: '00:00', hits: 3820, visits: 820 },
        { hour: '04:00', hits: 3180, visits: 610 },
        { hour: '08:00', hits: 12740, visits: 2420 },
        { hour: '12:00', hits: 18210, visits: 3540 },
        { hour: '16:00', hits: 19850, visits: 3810 },
        { hour: '20:00', hits: 14930, visits: 2950 }
      ],
      topPages: [
        { url: '/editor', views: 28410, entryRate: 42.1, exitRate: 18.2 },
        { url: '/managed-wordpress-hosting', views: 23560, entryRate: 24.5, exitRate: 32.6 },
        { url: '/pricing', views: 18220, entryRate: 12.8, exitRate: 27.4 },
        { url: '/insights/case-studies', views: 15480, entryRate: 8.2, exitRate: 21.1 }
      ],
      topKeywords: [
        { keyword: 'drag and drop site editor', visits: 1860, position: 4 },
        { keyword: 'managed wordpress hosting', visits: 1580, position: 7 },
        { keyword: 'seo analytics dashboard', visits: 940, position: 9 }
      ],
      topReferrers: [
        { source: 'partners.devweekly.com', visits: 620, type: 'referral' },
        { source: 'google / cpc', visits: 540, type: 'search' },
        { source: 'linkedin.com', visits: 320, type: 'social' }
      ],
      topCountries: [
        { country: 'United States', visits: 18640, bandwidthMb: 3620 },
        { country: 'United Kingdom', visits: 6420, bandwidthMb: 1254 },
        { country: 'Germany', visits: 4280, bandwidthMb: 998 },
        { country: 'Australia', visits: 3220, bandwidthMb: 762 }
      ],
      httpStatus: [
        { code: '200', description: 'OK', count: 249310 },
        { code: '301', description: 'Moved Permanently', count: 6420 },
        { code: '404', description: 'Not Found', count: 820 },
        { code: '500', description: 'Server Error', count: 44 }
      ]
    }
  },
  'demo-domain-2': {
    domainId: 'demo-domain-2',
    generatedAt,
    seo: {
      healthScore: 82,
      crawlabilityScore: 88,
      pageSpeedScore: 91,
      mobileUsabilityScore: 95,
      lighthouse: {
        performance: 93,
        accessibility: 97,
        bestPractices: 95,
        seo: 98
      },
      issues: [
        {
          id: 'issue-4',
          title: 'Thin content detected on /features/workflows',
          severity: 'warning',
          description: 'Word count is below competitors and lacks H2 topical coverage.',
          recommendation: 'Expand the section with workflow examples and embed comparison table schema.',
          impact: 'Supports rankings for automation and workflow modifiers.',
          affectedPages: 1
        },
        {
          id: 'issue-5',
          title: 'Internal links missing descriptive anchor text',
          severity: 'notice',
          description: 'Nine navigation links reuse “learn more” anchors.',
          recommendation: 'Update anchors with intent-rich descriptors to improve context signals.',
          impact: 'Improves topical relevance and crawlability.',
          affectedPages: 9
        }
      ],
      keywordRankings: [
        {
          keyword: 'jamstack deployment pipeline',
          position: 6,
          change: 2,
          url: 'https://altproductionstudio.io/workflows',
          searchVolume: 2600,
          difficulty: 46
        },
        {
          keyword: 'headless cms hosting',
          position: 9,
          change: 3,
          url: 'https://altproductionstudio.io/headless',
          searchVolume: 3200,
          difficulty: 51
        },
        {
          keyword: 'performance budget monitoring',
          position: 5,
          change: 0,
          url: 'https://altproductionstudio.io/performance',
          searchVolume: 1400,
          difficulty: 35
        }
      ],
      backlinkProfile: {
        totalBacklinks: 860,
        referringDomains: 174,
        authorityScore: 61,
        newLast30Days: 27,
        lostLast30Days: 8,
        topAnchorTexts: ['alt production studio', 'jamstack workflows', 'headless cms hosting']
      },
      structuredData: [
        {
          schemaType: 'Product',
          status: 'valid',
          notes: 'Plans expose Product schema with pricing microdata.'
        }
      ],
      competitors: [
        {
          domain: 'deployhub.app',
          visibilityScore: 57,
          keywordGap: 64,
          backlinkGap: -12,
          topKeyword: 'jamstack automation'
        }
      ],
      actionPlan: [
        {
          id: 'action-4',
          title: 'Publish workflow comparison guide',
          status: 'in-progress',
          priority: 'medium',
          owner: 'Product Marketing',
          dueDate: '2024-06-07',
          impact: 'Targets 12 long-tail keywords with commercial intent.'
        },
        {
          id: 'action-5',
          title: 'Run lighthouse regression monitoring in CI',
          status: 'completed',
          priority: 'high',
          owner: 'Platform Team',
          dueDate: '2024-05-12',
          impact: 'Prevents future performance regressions before release.'
        }
      ],
      serpFeatures: ['Video carousel presence', 'How-to rich cards'],
      monitoringCapabilities: [
        'SERP volatility alerts for tracked markets',
        'Keyword intent clustering with AI-assisted tagging',
        'Custom lighthouse budgets integrated with CI',
        'Automated backlink toxicity scoring'
      ]
    },
    awstats: {
      period: {
        month: 'May',
        year: 2024
      },
      totals: {
        visits: 23840,
        uniqueVisitors: 18420,
        pages: 96840,
        hits: 142280,
        bandwidthMb: 5124,
        avgVisitDuration: '00:03:48',
        bounceRate: 34.2
      },
      trafficSources: [
        { source: 'Organic search', visits: 12840, change: 7.8, percentage: 53.9 },
        { source: 'Direct', visits: 5480, change: 2.3, percentage: 23 },
        { source: 'Referral', visits: 3280, change: 4.2, percentage: 13.8 },
        { source: 'Social', visits: 1540, change: 6.9, percentage: 6.5 }
      ],
      daily: [
        { date: '2024-05-19', visits: 640, pages: 2740, bandwidthMb: 92 },
        { date: '2024-05-20', visits: 890, pages: 3560, bandwidthMb: 118 },
        { date: '2024-05-21', visits: 960, pages: 3710, bandwidthMb: 126 },
        { date: '2024-05-22', visits: 1010, pages: 3980, bandwidthMb: 132 },
        { date: '2024-05-23', visits: 980, pages: 3840, bandwidthMb: 129 },
        { date: '2024-05-24', visits: 1120, pages: 4210, bandwidthMb: 141 },
        { date: '2024-05-25', visits: 1180, pages: 4380, bandwidthMb: 146 }
      ],
      hourly: [
        { hour: '01:00', hits: 1840, visits: 340 },
        { hour: '07:00', hits: 5920, visits: 960 },
        { hour: '11:00', hits: 8640, visits: 1420 },
        { hour: '15:00', hits: 9120, visits: 1520 },
        { hour: '19:00', hits: 7640, visits: 1280 },
        { hour: '22:00', hits: 5120, visits: 820 }
      ],
      topPages: [
        { url: '/workflows', views: 16210, entryRate: 36.2, exitRate: 19.5 },
        { url: '/headless', views: 13420, entryRate: 21.7, exitRate: 24.3 },
        { url: '/performance', views: 11230, entryRate: 15.4, exitRate: 20.2 }
      ],
      topKeywords: [
        { keyword: 'jamstack deployment pipeline', visits: 820, position: 6 },
        { keyword: 'headless cms hosting', visits: 690, position: 9 },
        { keyword: 'performance budget monitoring', visits: 540, position: 5 }
      ],
      topReferrers: [
        { source: 'changelog.com', visits: 280, type: 'referral' },
        { source: 'github.com', visits: 240, type: 'referral' },
        { source: 'google / organic', visits: 820, type: 'search' }
      ],
      topCountries: [
        { country: 'United States', visits: 9240, bandwidthMb: 1940 },
        { country: 'Canada', visits: 2840, bandwidthMb: 640 },
        { country: 'Netherlands', visits: 2040, bandwidthMb: 460 }
      ],
      httpStatus: [
        { code: '200', description: 'OK', count: 136820 },
        { code: '301', description: 'Moved Permanently', count: 3200 },
        { code: '404', description: 'Not Found', count: 440 },
        { code: '429', description: 'Too Many Requests', count: 28 }
      ]
    }
  },
  'demo-domain-3': {
    domainId: 'demo-domain-3',
    generatedAt,
    seo: {
      healthScore: 56,
      crawlabilityScore: 62,
      pageSpeedScore: 71,
      mobileUsabilityScore: 68,
      lighthouse: {
        performance: 74,
        accessibility: 81,
        bestPractices: 79,
        seo: 82
      },
      issues: [
        {
          id: 'issue-6',
          title: 'Pending DNS verification',
          severity: 'critical',
          description: 'The domain is not yet verified which prevents production crawling.',
          recommendation: 'Complete TXT record verification with registrar.',
          impact: 'Search engines cannot index the property until verification completes.',
          affectedPages: 0
        },
        {
          id: 'issue-7',
          title: 'Robots.txt blocks staging directory',
          severity: 'warning',
          description: 'The default scaffold blocks /preview but site assets reference it.',
          recommendation: 'Update robots.txt to allow required assets and keep staging blocked.',
          impact: 'Ensures assets can be crawled once domain is live.',
          affectedPages: 5
        }
      ],
      keywordRankings: [
        {
          keyword: 'developer preview hosting',
          position: 48,
          change: 0,
          url: 'https://altproductionlabs.dev',
          searchVolume: 260,
          difficulty: 28
        }
      ],
      backlinkProfile: {
        totalBacklinks: 12,
        referringDomains: 6,
        authorityScore: 12,
        newLast30Days: 6,
        lostLast30Days: 0,
        topAnchorTexts: ['alt production labs preview', 'beta hosting labs']
      },
      structuredData: [],
      competitors: [],
      actionPlan: [
        {
          id: 'action-6',
          title: 'Finalize verification and launch staging content',
          status: 'todo',
          priority: 'high',
          owner: 'Labs Team',
          dueDate: '2024-05-27',
          impact: 'Unlocks crawlability and analytics for beta program.'
        }
      ],
      serpFeatures: [],
      monitoringCapabilities: [
        'Launch readiness checklist',
        'DNS verification tracking',
        'Content gap starter templates'
      ]
    },
    awstats: {
      period: {
        month: 'May',
        year: 2024
      },
      totals: {
        visits: 1240,
        uniqueVisitors: 980,
        pages: 3480,
        hits: 5640,
        bandwidthMb: 182,
        avgVisitDuration: '00:02:14',
        bounceRate: 58.7
      },
      trafficSources: [
        { source: 'Direct (beta invites)', visits: 620, change: 12.4, percentage: 50 },
        { source: 'Internal referrals', visits: 420, change: 8.8, percentage: 33.9 },
        { source: 'Email campaigns', visits: 200, change: -3.2, percentage: 16.1 }
      ],
      daily: [
        { date: '2024-05-19', visits: 44, pages: 126, bandwidthMb: 4 },
        { date: '2024-05-20', visits: 52, pages: 140, bandwidthMb: 5 },
        { date: '2024-05-21', visits: 60, pages: 152, bandwidthMb: 5 },
        { date: '2024-05-22', visits: 64, pages: 160, bandwidthMb: 6 },
        { date: '2024-05-23', visits: 58, pages: 148, bandwidthMb: 5 },
        { date: '2024-05-24', visits: 72, pages: 168, bandwidthMb: 6 },
        { date: '2024-05-25', visits: 76, pages: 172, bandwidthMb: 6 }
      ],
      hourly: [
        { hour: '09:00', hits: 420, visits: 70 },
        { hour: '13:00', hits: 620, visits: 90 },
        { hour: '17:00', hits: 540, visits: 82 }
      ],
      topPages: [
        { url: '/', views: 820, entryRate: 72.6, exitRate: 48.2 },
        { url: '/roadmap', views: 420, entryRate: 10.2, exitRate: 26.4 }
      ],
      topKeywords: [
        { keyword: 'alt production labs', visits: 110, position: 18 }
      ],
      topReferrers: [
        { source: 'internal-preview.altproductionhosting.com', visits: 260, type: 'referral' }
      ],
      topCountries: [
        { country: 'United States', visits: 420, bandwidthMb: 72 },
        { country: 'Poland', visits: 120, bandwidthMb: 18 }
      ],
      httpStatus: [
        { code: '200', description: 'OK', count: 5240 },
        { code: '302', description: 'Found', count: 220 },
        { code: '404', description: 'Not Found', count: 44 }
      ]
    }
  }
};

export const getDomainAnalytics = (domainId: string): DomainAnalytics | undefined =>
  domainAnalyticsStore[domainId];
