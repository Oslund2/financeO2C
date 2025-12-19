export type ContentNiche =
  | 'finance_business'
  | 'tech_software'
  | 'education'
  | 'health_fitness'
  | 'kids_family'
  | 'gaming'
  | 'entertainment_vlogs'
  | 'animation_storytelling';

export type AudienceType = 'general' | 'kids';

export interface NicheModifiers {
  cpmMultiplier: number;
  sponsorshipMultiplier: number;
  label: string;
  description: string;
}

export const NICHE_MODIFIERS: Record<ContentNiche, NicheModifiers> = {
  finance_business: {
    cpmMultiplier: 2.5,
    sponsorshipMultiplier: 2.0,
    label: 'Finance & Business',
    description: 'Highest CPMs due to valuable advertiser demographics'
  },
  tech_software: {
    cpmMultiplier: 2.0,
    sponsorshipMultiplier: 1.8,
    label: 'Tech & Software',
    description: 'Strong advertiser demand from tech companies'
  },
  education: {
    cpmMultiplier: 1.5,
    sponsorshipMultiplier: 1.3,
    label: 'Education',
    description: 'Moderate CPMs with engaged audiences'
  },
  health_fitness: {
    cpmMultiplier: 1.6,
    sponsorshipMultiplier: 1.5,
    label: 'Health & Fitness',
    description: 'Strong supplement and fitness brand interest'
  },
  kids_family: {
    cpmMultiplier: 0.4,
    sponsorshipMultiplier: 0.8,
    label: 'Kids & Family',
    description: 'Lower CPMs due to COPPA ad restrictions'
  },
  gaming: {
    cpmMultiplier: 0.8,
    sponsorshipMultiplier: 1.2,
    label: 'Gaming',
    description: 'Lower CPMs but strong sponsorship potential'
  },
  entertainment_vlogs: {
    cpmMultiplier: 0.9,
    sponsorshipMultiplier: 1.0,
    label: 'Entertainment & Vlogs',
    description: 'Average rates across the board'
  },
  animation_storytelling: {
    cpmMultiplier: 1.0,
    sponsorshipMultiplier: 1.2,
    label: 'Animation & Storytelling',
    description: 'Moderate CPMs with growing brand interest'
  }
};

export interface YouTubeRPMRanges {
  low: number;
  mid: number;
  high: number;
}

export const BASE_RPM_RANGES: YouTubeRPMRanges = {
  low: 1.00,
  mid: 3.00,
  high: 6.00
};

export const COPPA_RPM_RANGES: YouTubeRPMRanges = {
  low: 0.50,
  mid: 1.00,
  high: 2.00
};

export interface SponsorshipRates {
  perThousandViewsLow: number;
  perThousandViewsMid: number;
  perThousandViewsHigh: number;
}

export const BASE_SPONSORSHIP_RATES: SponsorshipRates = {
  perThousandViewsLow: 10,
  perThousandViewsMid: 20,
  perThousandViewsHigh: 30
};

export interface PlatformRevenueShare {
  platform: string;
  creatorShare: number;
  platformCut: number;
}

export const PLATFORM_REVENUE_SHARES: Record<string, PlatformRevenueShare> = {
  youtube: { platform: 'YouTube', creatorShare: 0.55, platformCut: 0.45 },
  tiktok: { platform: 'TikTok', creatorShare: 0.50, platformCut: 0.50 },
  instagram: { platform: 'Instagram', creatorShare: 0.55, platformCut: 0.45 }
};

export interface MonthlyViewTier {
  views: number;
  label: string;
  adRevenueLow: number;
  adRevenueHigh: number;
  sponsorshipLow: number;
  sponsorshipHigh: number;
  totalLow: number;
  totalHigh: number;
}

export interface AdRevenueBreakdown {
  grossRevenue: number;
  platformCut: number;
  creatorNet: number;
  effectiveRPM: number;
}

export interface SponsorshipBreakdown {
  estimatedLow: number;
  estimatedMid: number;
  estimatedHigh: number;
  likelihood: 'unlikely' | 'possible' | 'likely' | 'very_likely';
  likelihoodLabel: string;
}

export interface TotalRevenueProjection {
  monthlyViews: number;
  adRevenue: AdRevenueBreakdown;
  sponsorship: SponsorshipBreakdown;
  otherRevenue: {
    memberships: number;
    superChats: number;
    premiumViews: number;
  };
  totalLow: number;
  totalMid: number;
  totalHigh: number;
  scenario: 'conservative' | 'moderate' | 'optimistic';
}

export class YouTubeRevenueService {
  static calculateAdRevenue(
    views: number,
    niche: ContentNiche = 'animation_storytelling',
    audienceType: AudienceType = 'general'
  ): AdRevenueBreakdown {
    const nicheModifier = NICHE_MODIFIERS[niche];
    const baseRPM = audienceType === 'kids' ? COPPA_RPM_RANGES : BASE_RPM_RANGES;
    const effectiveRPM = baseRPM.mid * nicheModifier.cpmMultiplier;
    const grossRevenue = (views / 1000) * effectiveRPM / PLATFORM_REVENUE_SHARES.youtube.creatorShare;
    const platformCut = grossRevenue * PLATFORM_REVENUE_SHARES.youtube.platformCut;
    const creatorNet = grossRevenue - platformCut;

    return {
      grossRevenue,
      platformCut,
      creatorNet,
      effectiveRPM
    };
  }

  static calculateSponsorshipPotential(
    monthlyViews: number,
    niche: ContentNiche = 'animation_storytelling'
  ): SponsorshipBreakdown {
    const nicheModifier = NICHE_MODIFIERS[niche];
    const rates = BASE_SPONSORSHIP_RATES;

    const estimatedLow = (monthlyViews / 1000) * rates.perThousandViewsLow * nicheModifier.sponsorshipMultiplier;
    const estimatedMid = (monthlyViews / 1000) * rates.perThousandViewsMid * nicheModifier.sponsorshipMultiplier;
    const estimatedHigh = (monthlyViews / 1000) * rates.perThousandViewsHigh * nicheModifier.sponsorshipMultiplier;

    let likelihood: SponsorshipBreakdown['likelihood'];
    let likelihoodLabel: string;

    if (monthlyViews < 10000) {
      likelihood = 'unlikely';
      likelihoodLabel = 'Unlikely (build audience first)';
    } else if (monthlyViews < 50000) {
      likelihood = 'possible';
      likelihoodLabel = 'Possible (small brands)';
    } else if (monthlyViews < 500000) {
      likelihood = 'likely';
      likelihoodLabel = 'Likely (regular opportunities)';
    } else {
      likelihood = 'very_likely';
      likelihoodLabel = 'Very Likely (brand deals expected)';
    }

    return {
      estimatedLow,
      estimatedMid,
      estimatedHigh,
      likelihood,
      likelihoodLabel
    };
  }

  static calculateOtherRevenue(
    monthlyViews: number,
    subscriberCount: number = 0
  ): { memberships: number; superChats: number; premiumViews: number } {
    const premiumViewerPercent = 0.05;
    const premiumRPM = 0.50;
    const premiumViews = (monthlyViews * premiumViewerPercent / 1000) * premiumRPM;
    const membershipRate = subscriberCount > 1000 ? 0.001 : 0;
    const avgMembershipValue = 3;
    const memberships = subscriberCount * membershipRate * avgMembershipValue;
    const superChats = 0;

    return {
      memberships,
      superChats,
      premiumViews
    };
  }

  static calculateTotalProjection(
    monthlyViews: number,
    niche: ContentNiche = 'animation_storytelling',
    audienceType: AudienceType = 'general',
    subscriberCount: number = 0,
    scenario: 'conservative' | 'moderate' | 'optimistic' = 'moderate'
  ): TotalRevenueProjection {
    const adRevenue = this.calculateAdRevenue(monthlyViews, niche, audienceType);
    const sponsorship = this.calculateSponsorshipPotential(monthlyViews, niche);
    const otherRevenue = this.calculateOtherRevenue(monthlyViews, subscriberCount);

    let sponsorshipValue: number;
    switch (scenario) {
      case 'conservative':
        sponsorshipValue = sponsorship.likelihood === 'unlikely' ? 0 : sponsorship.estimatedLow * 0.25;
        break;
      case 'moderate':
        sponsorshipValue = sponsorship.likelihood === 'unlikely' ? 0 :
                          sponsorship.likelihood === 'possible' ? sponsorship.estimatedLow :
                          sponsorship.estimatedMid;
        break;
      case 'optimistic':
        sponsorshipValue = sponsorship.estimatedHigh;
        break;
    }

    const totalLow = adRevenue.creatorNet + (sponsorship.likelihood !== 'unlikely' ? sponsorship.estimatedLow * 0.25 : 0);
    const totalMid = adRevenue.creatorNet + sponsorshipValue + otherRevenue.premiumViews;
    const totalHigh = adRevenue.creatorNet + sponsorship.estimatedHigh + otherRevenue.memberships + otherRevenue.premiumViews;

    return {
      monthlyViews,
      adRevenue,
      sponsorship,
      otherRevenue,
      totalLow,
      totalMid,
      totalHigh,
      scenario
    };
  }

  static getMonthlyEarningsTiers(
    niche: ContentNiche = 'animation_storytelling',
    audienceType: AudienceType = 'general'
  ): MonthlyViewTier[] {
    const viewTiers = [50000, 100000, 500000, 1000000, 5000000];

    return viewTiers.map(views => {
      const projection = this.calculateTotalProjection(views, niche, audienceType);

      let label: string;
      if (views >= 1000000) {
        label = `${(views / 1000000).toFixed(0)}M`;
      } else {
        label = `${(views / 1000).toFixed(0)}K`;
      }

      return {
        views,
        label,
        adRevenueLow: projection.adRevenue.creatorNet * 0.5,
        adRevenueHigh: projection.adRevenue.creatorNet * 1.5,
        sponsorshipLow: projection.sponsorship.estimatedLow,
        sponsorshipHigh: projection.sponsorship.estimatedHigh,
        totalLow: projection.totalLow,
        totalHigh: projection.totalHigh
      };
    });
  }

  static getYPPRequirements(): {
    subscribers: number;
    watchHours: number;
    shortsViews: number;
  } {
    return {
      subscribers: 1000,
      watchHours: 4000,
      shortsViews: 10000000
    };
  }

  static formatCurrency(value: number): string {
    if (!isFinite(value) || isNaN(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  static formatViews(views: number): string {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(0)}K`;
    }
    return views.toString();
  }
}
