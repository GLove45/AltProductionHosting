import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '../src/routes/AppRoutes';

const mockSpaces = [
  {
    id: 'space-1',
    userId: 'demo-user',
    domainId: 'domain-1',
    name: 'Marketing site',
    storageLimitMb: 1024,
    storageUsedMb: 256,
    files: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
];

const mockDomains = [
  {
    id: 'domain-1',
    name: 'example.com',
    userId: 'demo-user',
    registrarProvider: 'cloudflare' as const,
    status: 'active' as const,
    verificationToken: 'token',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    verifiedAt: '2024-01-02T00:00:00.000Z'
  }
];

const mockAnalytics = {
  domainId: 'domain-1',
  generatedAt: '2024-01-03T00:00:00.000Z',
  seo: {
    healthScore: 92,
    crawlabilityScore: 88,
    pageSpeedScore: 90,
    mobileUsabilityScore: 86,
    lighthouse: {
      performance: 92,
      accessibility: 95,
      bestPractices: 90,
      seo: 93
    },
    issues: [
      {
        id: 'issue-1',
        title: 'Fix CLS on hero banner',
        severity: 'critical' as const,
        description: 'Large layout shifts detected on hero.',
        recommendation: 'Stabilise hero media dimensions.',
        impact: 'Improves engagement and conversions',
        affectedPages: 4
      }
    ],
    keywordRankings: [
      {
        keyword: 'managed hosting',
        position: 5,
        change: 1,
        url: '/hosting',
        searchVolume: 5400,
        difficulty: 47
      }
    ],
    backlinkProfile: {
      totalBacklinks: 1200,
      referringDomains: 180,
      authorityScore: 62,
      newLast30Days: 45,
      lostLast30Days: 12,
      topAnchorTexts: ['alt production', 'hosting intelligence']
    },
    structuredData: [
      {
        schemaType: 'Organization',
        status: 'valid' as const,
        notes: 'All required fields present.'
      }
    ],
    competitors: [
      {
        domain: 'competitor.com',
        visibilityScore: 78,
        keywordGap: 12,
        backlinkGap: 35,
        topKeyword: 'production hosting'
      }
    ],
    actionPlan: [
      {
        id: 'action-1',
        title: 'Ship CDN cache purge API',
        status: 'in-progress' as const,
        priority: 'high' as const,
        owner: 'Ops Guild',
        dueDate: '2024-01-15',
        impact: 'Reduces TTFB regressions across clients'
      }
    ],
    serpFeatures: ['Sitelinks', 'Image pack'],
    monitoringCapabilities: ['Log-based uptime', 'Real user monitoring']
  },
  awstats: {
    period: {
      month: 'January',
      year: 2024
    },
    totals: {
      visits: 4200,
      uniqueVisitors: 3100,
      pages: 9800,
      hits: 18400,
      bandwidthMb: 860,
      avgVisitDuration: '00:03:24',
      bounceRate: 38
    },
    trafficSources: [
      {
        source: 'Search',
        visits: 2200,
        change: 5,
        percentage: 52
      }
    ],
    daily: [
      {
        date: '2024-01-01',
        visits: 150,
        pages: 320,
        bandwidthMb: 32
      }
    ],
    hourly: [
      {
        hour: '10:00',
        hits: 600,
        visits: 180
      }
    ],
    topPages: [
      {
        url: '/hosting',
        views: 2200,
        entryRate: 42,
        exitRate: 18
      }
    ],
    topKeywords: [
      {
        keyword: 'managed hosting',
        visits: 400,
        position: 4
      }
    ],
    topReferrers: [
      {
        source: 'newsletter',
        visits: 120,
        type: 'referral' as const
      }
    ],
    topCountries: [
      {
        country: 'United Kingdom',
        visits: 900,
        bandwidthMb: 210
      }
    ],
    httpStatus: [
      {
        code: '200',
        description: 'OK',
        count: 17500
      }
    ]
  }
};

vi.mock('../src/services/apiClient', () => {
  return {
    apiClient: {
      get: vi.fn((url: string) => {
        if (url === '/hosting/spaces') {
          return Promise.resolve({ data: mockSpaces });
        }
        if (url === '/domains') {
          return Promise.resolve({ data: mockDomains });
        }
        if (url.startsWith('/domains/') && url.endsWith('/analytics')) {
          return Promise.resolve({ data: mockAnalytics });
        }
        return Promise.resolve({ data: null });
      })
    }
  };
});

const renderApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('frontend load sense check', () => {
  it('renders the dashboard and core intelligence panels', async () => {
    renderApp();

    const dashboardHeading = await screen.findByRole('heading', {
      level: 1,
      name: /your hosting dashboard/i
    });
    expect(dashboardHeading).toBeInTheDocument();

    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: /dashboard/i })).toBeInTheDocument();

    const seoHeading = await screen.findByRole('heading', {
      level: 2,
      name: /seo service intelligence/i
    });
    expect(seoHeading).toBeInTheDocument();

    const domainPanel = await screen.findByRole('heading', {
      level: 3,
      name: /example.com/i
    });
    expect(domainPanel).toBeInTheDocument();
  });
});
