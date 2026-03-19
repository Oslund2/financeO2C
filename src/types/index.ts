export type Actor = 'human' | 'ai' | 'hybrid';
export type RiskLevel = 'low' | 'medium' | 'high';
export type WorkflowType = 'manual' | 'automated' | 'hybrid';

export const O2C_PHASES = [
  'order_entry',
  'traffic_billing',
  'invoice',
  'aging',
  'collections',
  'disputes',
  'cash_application',
] as const;

export type O2CPhase = typeof O2C_PHASES[number];

export const PHASE_LABELS: Record<O2CPhase, string> = {
  order_entry: 'Order Entry & Validation',
  traffic_billing: 'Traffic & Billing Handoff',
  invoice: 'Invoice Generation & Delivery',
  aging: 'Aging & Collections Prioritization',
  collections: 'Collections Outreach',
  disputes: 'Dispute Resolution',
  cash_application: 'Cash Application',
};

export const PHASE_COLORS: Record<O2CPhase, string> = {
  order_entry: '#3b82f6',
  traffic_billing: '#8b5cf6',
  invoice: '#06b6d4',
  aging: '#f59e0b',
  collections: '#ef4444',
  disputes: '#ec4899',
  cash_application: '#10b981',
};

export const PHASE_ICONS: Record<O2CPhase, string> = {
  order_entry: 'ClipboardList',
  traffic_billing: 'ArrowRightLeft',
  invoice: 'FileText',
  aging: 'Clock',
  collections: 'Phone',
  disputes: 'Scale',
  cash_application: 'Banknote',
};

export interface WorkflowStep {
  id: string;
  phase: O2CPhase;
  stepOrder: number;
  name: string;
  description: string;
  actor: Actor;
  manualTimeMinutes: number;
  automatedTimeMinutes: number;
  frequencyPerMonth: number;
  errorRateManual: number;
  errorRateAutomated: number;
  aiCapability: string;
  dataSource: string;
  riskLevel: RiskLevel;
  notes: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  workflowType: WorkflowType;
  steps: WorkflowStep[];
}

export interface Assumptions {
  hourlyFteCost: number;
  fteCount: number;
  monthlyOrderVolume: number;
  aiCostPerTransaction: number;
  implementationCostMonths: number;
  implementationMonthlyCost: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  hourlyFteCost: 45,
  fteCount: 3.2,
  monthlyOrderVolume: 4200,
  aiCostPerTransaction: 0.03,
  implementationCostMonths: 4,
  implementationMonthlyCost: 25000,
};

export interface Scenario {
  id: string;
  name: string;
  description: string;
  baselineSteps: WorkflowStep[];
  automatedSteps: WorkflowStep[];
  assumptions: Assumptions;
  enabledPhases: O2CPhase[];
}

export interface SavingsResult {
  manualHoursPerMonth: number;
  automatedHoursPerMonth: number;
  hoursSavedPerMonth: number;
  fteSaved: number;
  dollarSavingsPerMonth: number;
  dollarSavingsPerYear: number;
  errorReductionPercent: number;
  roiMonths: number;
  aiCostPerMonth: number;
  netSavingsPerMonth: number;
  netSavingsPerYear: number;
}

export interface PhaseBreakdown {
  phase: O2CPhase;
  manualHours: number;
  automatedHours: number;
  hoursSaved: number;
  dollarsSaved: number;
  stepCount: number;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  phase?: O2CPhase;
  metric?: string;
}

// ---------------------------------------------------------------------------
// Client Profile Types
// ---------------------------------------------------------------------------
export type ProfileStatus = 'draft' | 'submitted' | 'ai_validated' | 'approved' | 'pushed_to_wideorbit' | 'rejected';
export type ProfileSource = 'salesperson_mobile' | 'client_self_service' | 'photo_ocr' | 'manual_entry';
export type AdvertiserType = 'direct' | 'agency_rep' | 'national' | 'local';
export type PaymentTerms = 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'prepay' | 'cod';

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  net_15: 'Net 15', net_30: 'Net 30', net_45: 'Net 45', net_60: 'Net 60',
  prepay: 'Prepay', cod: 'COD',
};

export const ADVERTISER_TYPE_LABELS: Record<AdvertiserType, string> = {
  direct: 'Direct', agency_rep: 'Agency Rep', national: 'National', local: 'Local',
};

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', ai_validated: 'AI Validated',
  approved: 'Approved', pushed_to_wideorbit: 'In WideOrbit', rejected: 'Rejected',
};

export const SCRIPPS_STATIONS = [
  'WKRN (Nashville)', 'WTVF (Nashville)', 'KJRH (Tulsa)', 'KSHB (Kansas City)',
  'WEWS (Cleveland)', 'WCPO (Cincinnati)', 'WPTV (West Palm Beach)', 'WFTS (Tampa)',
  'KNXV (Phoenix)', 'WXYZ (Detroit)', 'WMAR (Baltimore)', 'WMOR (Tampa)',
  'KGUN (Tucson)', 'WLEX (Lexington)', 'WRTV (Indianapolis)', 'KERO (Bakersfield)',
] as const;

export interface ClientProfile {
  id: string;
  status: ProfileStatus;
  source: ProfileSource;

  // Advertiser
  advertiserName: string;
  dbaName: string;
  advertiserType: AdvertiserType;
  industryCategory: string;
  taxId: string;
  website: string;

  // Agency
  agencyName: string;
  agencyContactName: string;
  agencyContactEmail: string;
  agencyContactPhone: string;
  agencyCommissionRate: number;

  // Billing Address
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingZip: string;

  // Mailing Address
  mailingSameAsBilling: boolean;
  mailingAddress1: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;

  // Primary Contact
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;

  // AP Contact
  apContactName: string;
  apContactEmail: string;
  apContactPhone: string;

  // Credit & Terms
  paymentTerms: PaymentTerms;
  creditLimit: number;
  creditAppRequired: boolean;
  poRequired: boolean;

  // Broadcast
  stations: string[];
  defaultDayparts: string[];
  contractStartDate: string;
  contractEndDate: string;
  specialInstructions: string;

  // Meta
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  validationScore?: number;
  validationIssues?: string[];
  duplicateWarning?: string;
}

export function createBlankProfile(): ClientProfile {
  return {
    id: `profile-${Date.now()}`,
    status: 'draft',
    source: 'salesperson_mobile',
    advertiserName: '', dbaName: '', advertiserType: 'direct', industryCategory: '', taxId: '', website: '',
    agencyName: '', agencyContactName: '', agencyContactEmail: '', agencyContactPhone: '', agencyCommissionRate: 15,
    billingAddress1: '', billingAddress2: '', billingCity: '', billingState: '', billingZip: '',
    mailingSameAsBilling: true, mailingAddress1: '', mailingCity: '', mailingState: '', mailingZip: '',
    contactName: '', contactTitle: '', contactEmail: '', contactPhone: '',
    apContactName: '', apContactEmail: '', apContactPhone: '',
    paymentTerms: 'net_30', creditLimit: 0, creditAppRequired: false, poRequired: false,
    stations: [], defaultDayparts: [], contractStartDate: '', contractEndDate: '', specialInstructions: '',
    createdBy: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}
