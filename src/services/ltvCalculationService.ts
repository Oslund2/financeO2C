export interface YearlyRevenue {
  year: number;
  retentionPercent: number;
  revenue: number;
  profit: number;
  cumulativeRevenue: number;
  cumulativeProfit: number;
}

export interface LTVCalculation {
  annualRevenue: number;
  yearsInService: number;
  decayRatePercent: number;
  minimumRetentionPercent: number;
  productionCost: number;
  yearlyBreakdown: YearlyRevenue[];
  lifetimeRevenue: number;
  lifetimeProfit: number;
  lifetimeMargin: number;
  paybackPeriodYears: number | null;
  averageAnnualProfit: number;
  longTailYears: number;
  longTailRevenue: number;
}

export interface EpisodeLTVData {
  datePutInService: Date | null;
  yearsActive: number;
  remainingYears: number;
  currentRetentionPercent: number;
  isInStablePhase: boolean;
}

export class LTVCalculationService {
  static calculateLifetimeValue(
    annualRevenue: number,
    productionCost: number,
    yearsInService: number = 5,
    decayRatePercent: number = 10.0,
    minimumRetentionPercent: number = 20.0
  ): LTVCalculation {
    const yearlyBreakdown: YearlyRevenue[] = [];
    let cumulativeRevenue = 0;
    let cumulativeProfit = -productionCost;
    let paybackPeriodYears: number | null = null;
    let longTailYears = 0;
    let longTailRevenue = 0;
    let stablePhaseReached = false;

    for (let year = 1; year <= yearsInService; year++) {
      const retentionPercent = Math.max(
        100 - (year - 1) * decayRatePercent,
        minimumRetentionPercent
      );

      const yearRevenue = annualRevenue * (retentionPercent / 100);
      cumulativeRevenue += yearRevenue;
      cumulativeProfit += yearRevenue;

      if (!stablePhaseReached && retentionPercent <= minimumRetentionPercent) {
        stablePhaseReached = true;
      }

      if (stablePhaseReached) {
        longTailYears++;
        longTailRevenue += yearRevenue;
      }

      if (paybackPeriodYears === null && cumulativeProfit >= 0) {
        if (year === 1) {
          paybackPeriodYears = yearRevenue > 0 ? productionCost / yearRevenue : null;
        } else {
          const previousCumulativeProfit = cumulativeProfit - yearRevenue;
          const fractionOfYear = Math.abs(previousCumulativeProfit) / yearRevenue;
          paybackPeriodYears = year - 1 + fractionOfYear;
        }
      }

      yearlyBreakdown.push({
        year,
        retentionPercent,
        revenue: yearRevenue,
        profit: yearRevenue,
        cumulativeRevenue,
        cumulativeProfit,
      });
    }

    const lifetimeRevenue = cumulativeRevenue;
    const lifetimeProfit = cumulativeRevenue - productionCost;
    const lifetimeMargin = lifetimeRevenue > 0 ? (lifetimeProfit / lifetimeRevenue) * 100 : 0;
    const averageAnnualProfit = yearsInService > 0 ? lifetimeProfit / yearsInService : 0;

    return {
      annualRevenue,
      yearsInService,
      decayRatePercent,
      minimumRetentionPercent,
      productionCost,
      yearlyBreakdown,
      lifetimeRevenue,
      lifetimeProfit,
      lifetimeMargin,
      paybackPeriodYears,
      averageAnnualProfit,
      longTailYears,
      longTailRevenue,
    };
  }

  static calculateEpisodeLTVData(
    datePutInService: string | null,
    projectedServiceYears: number,
    decayRatePercent: number,
    minimumRetentionPercent: number
  ): EpisodeLTVData {
    if (!datePutInService) {
      return {
        datePutInService: null,
        yearsActive: 0,
        remainingYears: projectedServiceYears,
        currentRetentionPercent: 100,
        isInStablePhase: false,
      };
    }

    const serviceDate = new Date(datePutInService);
    const now = new Date();
    const yearsActive = (now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const yearsActiveRounded = Math.max(0, yearsActive);

    const currentYear = Math.ceil(yearsActiveRounded) || 1;
    const currentRetentionPercent = Math.max(
      100 - (currentYear - 1) * decayRatePercent,
      minimumRetentionPercent
    );

    const isInStablePhase = currentRetentionPercent <= minimumRetentionPercent;
    const remainingYears = Math.max(0, projectedServiceYears - yearsActiveRounded);

    return {
      datePutInService: serviceDate,
      yearsActive: yearsActiveRounded,
      remainingYears,
      currentRetentionPercent,
      isInStablePhase,
    };
  }

  static formatYearsMonths(years: number | null): string {
    if (years === null || years < 0) return 'Not reached';

    const wholeYears = Math.floor(years);
    const months = Math.round((years - wholeYears) * 12);

    if (wholeYears === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      return `${wholeYears} year${wholeYears !== 1 ? 's' : ''}`;
    } else {
      return `${wholeYears} year${wholeYears !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
  }

  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  static formatPercent(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  static getRetentionPhaseLabel(retentionPercent: number, minimumRetentionPercent: number): string {
    if (retentionPercent <= minimumRetentionPercent) {
      return 'Stable Long-Tail';
    } else if (retentionPercent >= 80) {
      return 'Peak Performance';
    } else if (retentionPercent >= 50) {
      return 'Active Decay';
    } else {
      return 'Approaching Stable';
    }
  }

  static calculateBreakEvenYear(yearlyBreakdown: YearlyRevenue[]): number | null {
    const breakEvenYear = yearlyBreakdown.find(y => y.cumulativeProfit >= 0);
    return breakEvenYear ? breakEvenYear.year : null;
  }

  static getPhaseColor(retentionPercent: number, minimumRetentionPercent: number): string {
    if (retentionPercent <= minimumRetentionPercent) {
      return 'text-yellow-600';
    } else if (retentionPercent >= 80) {
      return 'text-green-600';
    } else if (retentionPercent >= 50) {
      return 'text-blue-600';
    } else {
      return 'text-orange-600';
    }
  }
}
