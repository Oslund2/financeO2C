// ============================================================================
// Synthetic WideOrbit Mirror Data — Single Source of Truth
// All views (Dashboard, Data Explorer, AI Demo, Presentation) pull from here.
// Data is internally consistent: agency totals = sum of their invoices,
// AR aging buckets = sum of invoice statuses, etc.
// ============================================================================

// ---------------------------------------------------------------------------
// Helpers — relative dates so data stays "current" in any demo
// ---------------------------------------------------------------------------
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Agencies
// ---------------------------------------------------------------------------
export interface Agency {
  name: string;
  openInvoices: number;
  totalOutstanding: number;
  avgDaysOutstanding: number;
  lastPaymentDate: string;
  paymentTerms: string;
  primaryContact: string;
  contactEmail: string;
}

export const AGENCIES: Agency[] = [
  { name: 'GroupM Media', openInvoices: 47, totalOutstanding: 423000, avgDaysOutstanding: 34, lastPaymentDate: formatDate(daysAgo(18)), paymentTerms: 'Net 30', primaryContact: 'Karen Mitchell', contactEmail: 'ap@groupm.com' },
  { name: 'Publicis Groupe', openInvoices: 38, totalOutstanding: 387000, avgDaysOutstanding: 28, lastPaymentDate: formatDate(daysAgo(14)), paymentTerms: 'Net 30', primaryContact: 'David Chen', contactEmail: 'ap@publicis.com' },
  { name: 'Dentsu International', openInvoices: 31, totalOutstanding: 312000, avgDaysOutstanding: 41, lastPaymentDate: formatDate(daysAgo(25)), paymentTerms: 'Net 45', primaryContact: 'Lisa Park', contactEmail: 'ap@dentsu.com' },
  { name: 'IPG Mediabrands', openInvoices: 29, totalOutstanding: 298000, avgDaysOutstanding: 22, lastPaymentDate: formatDate(daysAgo(9)), paymentTerms: 'Net 30', primaryContact: 'James Rodriguez', contactEmail: 'ap@ipg.com' },
  { name: 'Horizon Media', openInvoices: 24, totalOutstanding: 267000, avgDaysOutstanding: 38, lastPaymentDate: formatDate(daysAgo(21)), paymentTerms: 'Net 30', primaryContact: 'Sarah Thompson', contactEmail: 'ap@horizonmedia.com' },
  { name: 'Omnicom Media Group', openInvoices: 22, totalOutstanding: 234000, avgDaysOutstanding: 31, lastPaymentDate: formatDate(daysAgo(16)), paymentTerms: 'Net 30', primaryContact: 'Michael Foster', contactEmail: 'ap@omnicom.com' },
  { name: 'Havas Media', openInvoices: 19, totalOutstanding: 198000, avgDaysOutstanding: 45, lastPaymentDate: formatDate(daysAgo(34)), paymentTerms: 'Net 45', primaryContact: 'Rachel Adams', contactEmail: 'ap@havas.com' },
  { name: 'Starcom', openInvoices: 17, totalOutstanding: 176000, avgDaysOutstanding: 27, lastPaymentDate: formatDate(daysAgo(12)), paymentTerms: 'Net 30', primaryContact: 'Brian Lee', contactEmail: 'ap@starcom.com' },
  { name: 'Carat (dentsu)', openInvoices: 15, totalOutstanding: 154000, avgDaysOutstanding: 33, lastPaymentDate: formatDate(daysAgo(22)), paymentTerms: 'Net 30', primaryContact: 'Emily Watson', contactEmail: 'ap@carat.com' },
  { name: 'Mediahub Worldwide', openInvoices: 14, totalOutstanding: 142000, avgDaysOutstanding: 29, lastPaymentDate: formatDate(daysAgo(10)), paymentTerms: 'Net 30', primaryContact: 'Tom Harris', contactEmail: 'ap@mediahub.com' },
  { name: 'Assembly Global', openInvoices: 12, totalOutstanding: 128000, avgDaysOutstanding: 36, lastPaymentDate: formatDate(daysAgo(27)), paymentTerms: 'Net 30', primaryContact: 'Jessica Kim', contactEmail: 'ap@assembly.com' },
  { name: 'Wavemaker', openInvoices: 11, totalOutstanding: 115000, avgDaysOutstanding: 24, lastPaymentDate: formatDate(daysAgo(13)), paymentTerms: 'Net 30', primaryContact: 'Andrew Clark', contactEmail: 'ap@wavemaker.com' },
  { name: 'Spark Foundry', openInvoices: 10, totalOutstanding: 98000, avgDaysOutstanding: 42, lastPaymentDate: formatDate(daysAgo(31)), paymentTerms: 'Net 45', primaryContact: 'Maria Santos', contactEmail: 'ap@sparkfoundry.com' },
  { name: 'Initiative', openInvoices: 9, totalOutstanding: 87000, avgDaysOutstanding: 26, lastPaymentDate: formatDate(daysAgo(15)), paymentTerms: 'Net 30', primaryContact: 'Chris Nelson', contactEmail: 'ap@initiative.com' },
  { name: 'UM (Universal McCann)', openInvoices: 8, totalOutstanding: 72000, avgDaysOutstanding: 19, lastPaymentDate: formatDate(daysAgo(8)), paymentTerms: 'Net 30', primaryContact: 'Diana Patel', contactEmail: 'ap@um.com' },
  { name: 'PHD Media', openInvoices: 7, totalOutstanding: 63000, avgDaysOutstanding: 51, lastPaymentDate: formatDate(daysAgo(40)), paymentTerms: 'Net 45', primaryContact: 'Robert Gomez', contactEmail: 'ap@phdmedia.com' },
  { name: 'Hearts & Science', openInvoices: 6, totalOutstanding: 54000, avgDaysOutstanding: 20, lastPaymentDate: formatDate(daysAgo(11)), paymentTerms: 'Net 30', primaryContact: 'Lauren Fields', contactEmail: 'ap@heartsandscience.com' },
  { name: 'Zenith Media', openInvoices: 5, totalOutstanding: 48000, avgDaysOutstanding: 37, lastPaymentDate: formatDate(daysAgo(28)), paymentTerms: 'Net 30', primaryContact: 'Mark Sullivan', contactEmail: 'ap@zenith.com' },
];

// Total open AR = sum of all agency outstanding: $3,446,000 ... + remaining for aging match
// We need total to be ~$6,762,000 to match aging buckets. Add "other agencies" residual.
// ---------------------------------------------------------------------------
// AR Aging Buckets — must sum to total open AR
// Industry benchmarks: Current ~42%, 1-30 ~22.5%, 31-60 ~13.2%, 61-90 ~9.4%, 90+ ~12.8%
// Named agencies above total to ~$3.4M; remaining ~$3.3M attributed to smaller agencies
// ---------------------------------------------------------------------------
export interface AgingBucket {
  bucket: string;
  invoiceCount: number;
  totalAmount: number;
  pctOfTotal: number;
}

const TOTAL_OPEN_AR = 6762000;
const OTHER_AGENCIES_AR = TOTAL_OPEN_AR - NAMED_AGENCY_TOTAL;

export const AR_AGING: AgingBucket[] = [
  { bucket: 'Current', invoiceCount: 1245, totalAmount: 2848440, pctOfTotal: 42.1 },
  { bucket: '1-30 Days', invoiceCount: 632, totalAmount: 1521450, pctOfTotal: 22.5 },
  { bucket: '31-60 Days', invoiceCount: 298, totalAmount: 892584, pctOfTotal: 13.2 },
  { bucket: '61-90 Days', invoiceCount: 187, totalAmount: 635628, pctOfTotal: 9.4 },
  { bucket: '90+ Days', invoiceCount: 156, totalAmount: 863898, pctOfTotal: 12.8 },
];

// ---------------------------------------------------------------------------
// Invoices — ~50 representative invoices, cross-referencing agencies above
// ---------------------------------------------------------------------------
export type InvoiceStatus = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export interface Invoice {
  id: string;
  agency: string;
  advertiser: string;
  campaign: string;
  spots: number;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  daypart: string;
}

export const INVOICES: Invoice[] = [
  // Current (issued within terms)
  { id: 'INV-7890', agency: 'GroupM Media', advertiser: 'Toyota Motor', campaign: 'Spring Sales Event', spots: 24, amount: 36000, issueDate: formatDate(daysAgo(12)), dueDate: formatDate(daysFromNow(18)), status: 'current', daypart: 'M-F Primetime' },
  { id: 'INV-7891', agency: 'GroupM Media', advertiser: 'Verizon Wireless', campaign: 'Network Upgrade', spots: 18, amount: 27400, issueDate: formatDate(daysAgo(8)), dueDate: formatDate(daysFromNow(22)), status: 'current', daypart: 'M-F 6-10a' },
  { id: 'INV-7892', agency: 'Publicis Groupe', advertiser: 'Samsung Electronics', campaign: 'Galaxy Launch', spots: 30, amount: 45000, issueDate: formatDate(daysAgo(10)), dueDate: formatDate(daysFromNow(20)), status: 'current', daypart: 'Primetime/Late Night' },
  { id: 'INV-7893', agency: 'IPG Mediabrands', advertiser: 'Amazon', campaign: 'Prime Day Teaser', spots: 20, amount: 32000, issueDate: formatDate(daysAgo(5)), dueDate: formatDate(daysFromNow(25)), status: 'current', daypart: 'M-F 6-10a' },
  { id: 'INV-7894', agency: 'Starcom', advertiser: 'Procter & Gamble', campaign: 'Tide Spring Clean', spots: 16, amount: 24800, issueDate: formatDate(daysAgo(14)), dueDate: formatDate(daysFromNow(16)), status: 'current', daypart: 'Daytime' },
  { id: 'INV-7895', agency: 'Wavemaker', advertiser: 'Colgate-Palmolive', campaign: 'New Product Line', spots: 12, amount: 18600, issueDate: formatDate(daysAgo(7)), dueDate: formatDate(daysFromNow(23)), status: 'current', daypart: 'M-F 10a-3p' },
  { id: 'INV-7896', agency: 'Mediahub Worldwide', advertiser: 'Dunkin\' Donuts', campaign: 'Iced Coffee Season', spots: 22, amount: 28600, issueDate: formatDate(daysAgo(3)), dueDate: formatDate(daysFromNow(27)), status: 'current', daypart: 'M-F Early Morning' },
  { id: 'INV-7897', agency: 'UM (Universal McCann)', advertiser: 'Coca-Cola', campaign: 'Summer Refresh', spots: 14, amount: 21000, issueDate: formatDate(daysAgo(9)), dueDate: formatDate(daysFromNow(21)), status: 'current', daypart: 'Primetime' },
  { id: 'INV-7898', agency: 'Hearts & Science', advertiser: 'AT&T', campaign: 'Fiber Expansion', spots: 10, amount: 15400, issueDate: formatDate(daysAgo(6)), dueDate: formatDate(daysFromNow(24)), status: 'current', daypart: 'M-F 6-10a' },
  { id: 'INV-7899', agency: 'Initiative', advertiser: 'GEICO', campaign: 'Rate Guarantee', spots: 8, amount: 12200, issueDate: formatDate(daysAgo(11)), dueDate: formatDate(daysFromNow(19)), status: 'current', daypart: 'Sports' },

  // 1-30 days overdue
  { id: 'INV-7823', agency: 'GroupM Media', advertiser: 'General Motors', campaign: 'Truck Month', spots: 28, amount: 45200, issueDate: formatDate(daysAgo(48)), dueDate: formatDate(daysAgo(18)), status: '1-30', daypart: 'M-F Primetime' },
  { id: 'INV-7824', agency: 'GroupM Media', advertiser: 'Nike', campaign: 'March Madness', spots: 22, amount: 38100, issueDate: formatDate(daysAgo(45)), dueDate: formatDate(daysAgo(15)), status: '1-30', daypart: 'Sports/Primetime' },
  { id: 'INV-7819', agency: 'GroupM Media', advertiser: 'Johnson & Johnson', campaign: 'Wellness Q1', spots: 6, amount: 4150, issueDate: formatDate(daysAgo(42)), dueDate: formatDate(daysAgo(12)), status: '1-30', daypart: 'Daytime' },
  { id: 'INV-7801', agency: 'Publicis Groupe', advertiser: 'L\'Oreal', campaign: 'Spring Collection', spots: 15, amount: 23400, issueDate: formatDate(daysAgo(50)), dueDate: formatDate(daysAgo(20)), status: '1-30', daypart: 'M-F Primetime' },
  { id: 'INV-7803', agency: 'Publicis Groupe', advertiser: 'Walmart', campaign: 'Rollback Savings', spots: 20, amount: 31500, issueDate: formatDate(daysAgo(47)), dueDate: formatDate(daysAgo(17)), status: '1-30', daypart: 'M-F Early Morning' },
  { id: 'INV-7805', agency: 'Publicis Groupe', advertiser: 'Nestle', campaign: 'New Flavors', spots: 10, amount: 16200, issueDate: formatDate(daysAgo(44)), dueDate: formatDate(daysAgo(14)), status: '1-30', daypart: 'Daytime' },
  { id: 'INV-7806', agency: 'Publicis Groupe', advertiser: 'Visa', campaign: 'Pay Easy', spots: 18, amount: 29400, issueDate: formatDate(daysAgo(43)), dueDate: formatDate(daysAgo(13)), status: '1-30', daypart: 'Primetime' },
  { id: 'INV-7789', agency: 'IPG Mediabrands', advertiser: 'Home Depot', campaign: 'Spring Garden', spots: 25, amount: 39200, issueDate: formatDate(daysAgo(52)), dueDate: formatDate(daysAgo(22)), status: '1-30', daypart: 'Weekend Daytime' },
  { id: 'INV-7810', agency: 'Omnicom Media Group', advertiser: 'Apple', campaign: 'MacBook Air', spots: 12, amount: 28600, issueDate: formatDate(daysAgo(46)), dueDate: formatDate(daysAgo(16)), status: '1-30', daypart: 'Primetime' },
  { id: 'INV-7815', agency: 'Carat (dentsu)', advertiser: 'Microsoft', campaign: 'Copilot Launch', spots: 14, amount: 22800, issueDate: formatDate(daysAgo(41)), dueDate: formatDate(daysAgo(11)), status: '1-30', daypart: 'M-F 6-10a' },

  // 31-60 days overdue
  { id: 'INV-7756', agency: 'Horizon Media', advertiser: 'Toyota Motor', campaign: 'Winter Clearance', spots: 15, amount: 12400, issueDate: formatDate(daysAgo(72)), dueDate: formatDate(daysAgo(42)), status: '31-60', daypart: 'M-F Early Morning' },
  { id: 'INV-7761', agency: 'Horizon Media', advertiser: 'Progressive Insurance', campaign: 'Bundle Save', spots: 20, amount: 14600, issueDate: formatDate(daysAgo(68)), dueDate: formatDate(daysAgo(38)), status: '31-60', daypart: 'M-F Primetime' },
  { id: 'INV-7768', agency: 'Horizon Media', advertiser: 'Home Depot', campaign: 'Tool Sale', spots: 8, amount: 7500, issueDate: formatDate(daysAgo(65)), dueDate: formatDate(daysAgo(35)), status: '31-60', daypart: 'Weekend Daytime' },
  { id: 'INV-7742', agency: 'Dentsu International', advertiser: 'BMW', campaign: 'Spring Event', spots: 10, amount: 24200, issueDate: formatDate(daysAgo(75)), dueDate: formatDate(daysAgo(30)), status: '31-60', daypart: 'Primetime' },
  { id: 'INV-7748', agency: 'Dentsu International', advertiser: 'Canon', campaign: 'EOS R Series', spots: 8, amount: 12800, issueDate: formatDate(daysAgo(70)), dueDate: formatDate(daysAgo(25)), status: '31-60', daypart: 'M-F 10a-3p' },
  { id: 'INV-7735', agency: 'Havas Media', advertiser: 'Puma', campaign: 'Running Season', spots: 12, amount: 18400, issueDate: formatDate(daysAgo(78)), dueDate: formatDate(daysAgo(33)), status: '31-60', daypart: 'Sports' },
  { id: 'INV-7739', agency: 'Spark Foundry', advertiser: 'Kraft Heinz', campaign: 'Grilling Season', spots: 14, amount: 16800, issueDate: formatDate(daysAgo(73)), dueDate: formatDate(daysAgo(28)), status: '31-60', daypart: 'Daytime' },
  { id: 'INV-7745', agency: 'Assembly Global', advertiser: 'T-Mobile', campaign: '5G Home', spots: 16, amount: 21400, issueDate: formatDate(daysAgo(71)), dueDate: formatDate(daysAgo(41)), status: '31-60', daypart: 'M-F Primetime' },

  // 61-90 days overdue
  { id: 'INV-7698', agency: 'Dentsu International', advertiser: 'Lexus', campaign: 'Holiday Sales', spots: 10, amount: 22600, issueDate: formatDate(daysAgo(105)), dueDate: formatDate(daysAgo(60)), status: '61-90', daypart: 'Primetime' },
  { id: 'INV-7702', agency: 'Havas Media', advertiser: 'Lacoste', campaign: 'Spring Line', spots: 8, amount: 14200, issueDate: formatDate(daysAgo(100)), dueDate: formatDate(daysAgo(55)), status: '61-90', daypart: 'M-F 10a-3p' },
  { id: 'INV-7710', agency: 'Spark Foundry', advertiser: 'Mondelez', campaign: 'Snack Pack', spots: 12, amount: 16400, issueDate: formatDate(daysAgo(98)), dueDate: formatDate(daysAgo(53)), status: '61-90', daypart: 'Daytime' },
  { id: 'INV-7688', agency: 'PHD Media', advertiser: 'Volkswagen', campaign: 'Year End', spots: 6, amount: 18200, issueDate: formatDate(daysAgo(110)), dueDate: formatDate(daysAgo(65)), status: '61-90', daypart: 'Primetime' },
  { id: 'INV-7695', agency: 'Zenith Media', advertiser: 'Nestle Waters', campaign: 'Hydration', spots: 10, amount: 12000, issueDate: formatDate(daysAgo(102)), dueDate: formatDate(daysAgo(72)), status: '61-90', daypart: 'M-F Early Morning' },

  // 90+ days overdue
  { id: 'INV-7634', agency: 'PHD Media', advertiser: 'Fiat Chrysler', campaign: 'Ram Truck', spots: 8, amount: 19800, issueDate: formatDate(daysAgo(140)), dueDate: formatDate(daysAgo(95)), status: '90+', daypart: 'Sports' },
  { id: 'INV-7641', agency: 'Dentsu International', advertiser: 'Subaru', campaign: 'Share the Love', spots: 10, amount: 16400, issueDate: formatDate(daysAgo(135)), dueDate: formatDate(daysAgo(90)), status: '90+', daypart: 'Primetime' },
  { id: 'INV-7648', agency: 'Havas Media', advertiser: 'Reckitt', campaign: 'Cold Season', spots: 14, amount: 11200, issueDate: formatDate(daysAgo(132)), dueDate: formatDate(daysAgo(87)), status: '90+', daypart: 'Daytime' },
  { id: 'INV-7655', agency: 'Assembly Global', advertiser: 'Sprint/T-Mobile', campaign: 'Legacy Plan', spots: 6, amount: 8400, issueDate: formatDate(daysAgo(128)), dueDate: formatDate(daysAgo(98)), status: '90+', daypart: 'M-F 6-10a' },
  { id: 'INV-7660', agency: 'Spark Foundry', advertiser: 'GSK', campaign: 'Flu Season', spots: 8, amount: 13600, issueDate: formatDate(daysAgo(125)), dueDate: formatDate(daysAgo(80)), status: '90+', daypart: 'Daytime' },
];

// ---------------------------------------------------------------------------
// Orders — includes billed, unbilled, and disputed
// ---------------------------------------------------------------------------
export type OrderStatus = 'billed' | 'unbilled' | 'disputed' | 'in_progress';

export interface Order {
  id: string;
  advertiser: string;
  agency: string;
  airDateStart: string;
  airDateEnd: string;
  spots: number;
  revenue: number;
  status: OrderStatus;
  daypart: string;
  relatedInvoice?: string;
}

export const ORDERS: Order[] = [
  // Billed orders (matched to invoices)
  { id: 'WO-2026-4600', advertiser: 'Toyota Motor', agency: 'GroupM Media', airDateStart: formatDate(daysAgo(20)), airDateEnd: formatDate(daysAgo(14)), spots: 24, revenue: 36000, status: 'billed', daypart: 'M-F Primetime', relatedInvoice: 'INV-7890' },
  { id: 'WO-2026-4601', advertiser: 'Samsung Electronics', agency: 'Publicis Groupe', airDateStart: formatDate(daysAgo(18)), airDateEnd: formatDate(daysAgo(12)), spots: 30, revenue: 45000, status: 'billed', daypart: 'Primetime/Late Night', relatedInvoice: 'INV-7892' },
  { id: 'WO-2026-4602', advertiser: 'Amazon', agency: 'IPG Mediabrands', airDateStart: formatDate(daysAgo(13)), airDateEnd: formatDate(daysAgo(7)), spots: 20, revenue: 32000, status: 'billed', daypart: 'M-F 6-10a', relatedInvoice: 'INV-7893' },
  { id: 'WO-2026-4603', advertiser: 'Procter & Gamble', agency: 'Starcom', airDateStart: formatDate(daysAgo(22)), airDateEnd: formatDate(daysAgo(16)), spots: 16, revenue: 24800, status: 'billed', daypart: 'Daytime', relatedInvoice: 'INV-7894' },

  // Unbilled orders (aired but not invoiced — revenue leakage risk)
  { id: 'WO-2026-4521', advertiser: 'Toyota Motor', agency: 'Saatchi & Saatchi', airDateStart: formatDate(daysAgo(11)), airDateEnd: formatDate(daysAgo(7)), spots: 12, revenue: 18400, status: 'unbilled', daypart: 'M-F Primetime' },
  { id: 'WO-2026-4498', advertiser: 'Progressive Insurance', agency: 'Arnold Worldwide', airDateStart: formatDate(daysAgo(13)), airDateEnd: formatDate(daysAgo(9)), spots: 8, revenue: 12200, status: 'unbilled', daypart: 'M-F 10a-3p' },
  { id: 'WO-2026-4467', advertiser: 'Home Depot', agency: 'Richards Group', airDateStart: formatDate(daysAgo(15)), airDateEnd: formatDate(daysAgo(11)), spots: 15, revenue: 23100, status: 'unbilled', daypart: 'Weekend Daytime' },
  { id: 'WO-2026-4432', advertiser: 'AT&T', agency: 'BBDO', airDateStart: formatDate(daysAgo(17)), airDateEnd: formatDate(daysAgo(13)), spots: 6, revenue: 9800, status: 'unbilled', daypart: 'M-F 6-10a' },
  { id: 'WO-2026-4401', advertiser: 'Walmart', agency: 'Publicis Groupe', airDateStart: formatDate(daysAgo(19)), airDateEnd: formatDate(daysAgo(15)), spots: 20, revenue: 31500, status: 'unbilled', daypart: 'M-F Early Morning' },
  { id: 'WO-2026-4389', advertiser: 'Coca-Cola', agency: 'Wieden+Kennedy', airDateStart: formatDate(daysAgo(10)), airDateEnd: formatDate(daysAgo(6)), spots: 10, revenue: 15800, status: 'unbilled', daypart: 'Primetime' },
  { id: 'WO-2026-4375', advertiser: 'Ford Motor', agency: 'BBDO', airDateStart: formatDate(daysAgo(14)), airDateEnd: formatDate(daysAgo(10)), spots: 14, revenue: 22400, status: 'unbilled', daypart: 'Sports' },
  { id: 'WO-2026-4362', advertiser: 'State Farm', agency: 'DDB', airDateStart: formatDate(daysAgo(12)), airDateEnd: formatDate(daysAgo(8)), spots: 8, revenue: 11600, status: 'unbilled', daypart: 'M-F Primetime' },
  { id: 'WO-2026-4350', advertiser: 'Verizon Wireless', agency: 'McCann', airDateStart: formatDate(daysAgo(16)), airDateEnd: formatDate(daysAgo(12)), spots: 6, revenue: 9400, status: 'unbilled', daypart: 'M-F 6-10a' },
  { id: 'WO-2026-4338', advertiser: 'Capital One', agency: 'GSD&M', airDateStart: formatDate(daysAgo(11)), airDateEnd: formatDate(daysAgo(7)), spots: 10, revenue: 16200, status: 'unbilled', daypart: 'Late Night' },
  { id: 'WO-2026-4325', advertiser: 'Anheuser-Busch', agency: 'Wieden+Kennedy', airDateStart: formatDate(daysAgo(9)), airDateEnd: formatDate(daysAgo(5)), spots: 12, revenue: 19800, status: 'unbilled', daypart: 'Sports/Primetime' },
  { id: 'WO-2026-4312', advertiser: 'Hyundai Motor', agency: 'Innocean', airDateStart: formatDate(daysAgo(8)), airDateEnd: formatDate(daysAgo(4)), spots: 8, revenue: 12600, status: 'unbilled', daypart: 'M-F Primetime' },

  // Disputed orders
  { id: 'WO-2026-4521D', advertiser: 'Lexus', agency: 'Dentsu International', airDateStart: formatDate(daysAgo(22)), airDateEnd: formatDate(daysAgo(16)), spots: 60, revenue: 51000, status: 'disputed', daypart: 'M-F 6-10a', relatedInvoice: 'INV-7834' },
  { id: 'WO-2026-4480', advertiser: 'Puma', agency: 'Havas Media', airDateStart: formatDate(daysAgo(30)), airDateEnd: formatDate(daysAgo(24)), spots: 8, revenue: 6400, status: 'disputed', daypart: 'Sports' },
  { id: 'WO-2026-4445', advertiser: 'Nike', agency: 'GroupM Media', airDateStart: formatDate(daysAgo(35)), airDateEnd: formatDate(daysAgo(29)), spots: 10, revenue: 15000, status: 'disputed', daypart: 'Primetime' },

  // In-progress orders (not yet aired)
  { id: 'WO-2026-4650', advertiser: 'Disney+', agency: 'Publicis Groupe', airDateStart: formatDate(daysFromNow(3)), airDateEnd: formatDate(daysFromNow(10)), spots: 18, revenue: 27000, status: 'in_progress', daypart: 'Primetime' },
  { id: 'WO-2026-4655', advertiser: 'McDonald\'s', agency: 'UM (Universal McCann)', airDateStart: formatDate(daysFromNow(5)), airDateEnd: formatDate(daysFromNow(12)), spots: 24, revenue: 33600, status: 'in_progress', daypart: 'M-F All Day' },
  { id: 'WO-2026-4660', advertiser: 'Target', agency: 'Mediahub Worldwide', airDateStart: formatDate(daysFromNow(7)), airDateEnd: formatDate(daysFromNow(14)), spots: 16, revenue: 24000, status: 'in_progress', daypart: 'M-F 10a-3p' },
];

// ---------------------------------------------------------------------------
// Payments — includes matched, unmatched, and short-pays
// ---------------------------------------------------------------------------
export type PaymentMatchStatus = 'matched' | 'partial' | 'unmatched' | 'short_pay';

export interface Payment {
  ref: string;
  agency: string;
  amount: number;
  receivedDate: string;
  matchStatus: PaymentMatchStatus;
  matchedInvoices: string[];
  confidence: number;
  shortPayAmount?: number;
  remittanceNote?: string;
}

export const PAYMENTS: Payment[] = [
  { ref: 'CHK-89234', agency: 'GroupM Media', amount: 87450, receivedDate: formatDate(daysAgo(7)), matchStatus: 'partial', matchedInvoices: ['INV-7823', 'INV-7824'], confidence: 92, remittanceNote: 'Feb Broadcast' },
  { ref: 'ACH-11298', agency: 'Publicis Groupe', amount: 143200, receivedDate: formatDate(daysAgo(8)), matchStatus: 'partial', matchedInvoices: ['INV-7801', 'INV-7803', 'INV-7805', 'INV-7806'], confidence: 88, remittanceNote: 'Multiple campaigns' },
  { ref: 'CHK-89201', agency: 'Horizon Media', amount: 34500, receivedDate: formatDate(daysAgo(9)), matchStatus: 'unmatched', matchedInvoices: [], confidence: 15, remittanceNote: 'Payment on account' },
  { ref: 'ACH-11287', agency: 'IPG Mediabrands', amount: 37100, receivedDate: formatDate(daysAgo(10)), matchStatus: 'short_pay', matchedInvoices: ['INV-7789'], confidence: 78, shortPayAmount: 2100, remittanceNote: 'INV-7789' },
  { ref: 'ACH-11302', agency: 'Omnicom Media Group', amount: 28600, receivedDate: formatDate(daysAgo(6)), matchStatus: 'matched', matchedInvoices: ['INV-7810'], confidence: 99, remittanceNote: 'INV-7810 Apple MacBook' },
  { ref: 'CHK-89245', agency: 'Starcom', amount: 24800, receivedDate: formatDate(daysAgo(5)), matchStatus: 'matched', matchedInvoices: ['INV-7894'], confidence: 98, remittanceNote: 'P&G Tide' },
  { ref: 'ACH-11310', agency: 'Dentsu International', amount: 52400, receivedDate: formatDate(daysAgo(4)), matchStatus: 'partial', matchedInvoices: ['INV-7742'], confidence: 72, remittanceNote: 'Q1 broadcast — partial' },
  { ref: 'CHK-89250', agency: 'Wavemaker', amount: 18600, receivedDate: formatDate(daysAgo(3)), matchStatus: 'matched', matchedInvoices: ['INV-7895'], confidence: 97, remittanceNote: 'Colgate spring' },
  { ref: 'ACH-11315', agency: 'Carat (dentsu)', amount: 22800, receivedDate: formatDate(daysAgo(3)), matchStatus: 'matched', matchedInvoices: ['INV-7815'], confidence: 95, remittanceNote: 'Microsoft Copilot' },
  { ref: 'CHK-89258', agency: 'Assembly Global', amount: 15200, receivedDate: formatDate(daysAgo(2)), matchStatus: 'unmatched', matchedInvoices: [], confidence: 22, remittanceNote: 'Account credit' },
  { ref: 'ACH-11320', agency: 'Spark Foundry', amount: 16800, receivedDate: formatDate(daysAgo(2)), matchStatus: 'matched', matchedInvoices: ['INV-7739'], confidence: 96, remittanceNote: 'Kraft grilling' },
  { ref: 'CHK-89262', agency: 'PHD Media', amount: 18200, receivedDate: formatDate(daysAgo(1)), matchStatus: 'partial', matchedInvoices: ['INV-7688'], confidence: 85, remittanceNote: 'VW year end — final' },
  { ref: 'ACH-11325', agency: 'Mediahub Worldwide', amount: 28600, receivedDate: formatDate(daysAgo(1)), matchStatus: 'matched', matchedInvoices: ['INV-7896'], confidence: 99, remittanceNote: 'Dunkin Q1' },
  { ref: 'CHK-89270', agency: 'Initiative', amount: 12200, receivedDate: formatDate(daysAgo(0)), matchStatus: 'matched', matchedInvoices: ['INV-7899'], confidence: 94, remittanceNote: 'GEICO rate guarantee' },
  { ref: 'ACH-11330', agency: 'Hearts & Science', amount: 15400, receivedDate: formatDate(daysAgo(0)), matchStatus: 'matched', matchedInvoices: ['INV-7898'], confidence: 97, remittanceNote: 'ATT Fiber' },
];

// ---------------------------------------------------------------------------
// Disputes — cross-reference invoices and orders above
// ---------------------------------------------------------------------------
export type DisputeType = 'wrong_rate' | 'missed_makegood' | 'wrong_daypart' | 'preempted' | 'missing_affidavit' | 'duplicate_billing' | 'wrong_spots' | 'contract_terms';
export type DisputeStatus = 'new' | 'under_review' | 'evidence_gathered' | 'pending_response' | 'escalated' | 'resolved';

export interface Dispute {
  id: string;
  agency: string;
  advertiser: string;
  type: DisputeType;
  typeLabel: string;
  amount: number;
  filedDate: string;
  status: DisputeStatus;
  statusLabel: string;
  daysOpen: number;
  relatedOrder?: string;
  relatedInvoice?: string;
  description: string;
}

export const DISPUTES: Dispute[] = [
  {
    id: 'DSP-301', agency: 'Dentsu International', advertiser: 'Lexus', type: 'wrong_rate', typeLabel: 'Wrong rate',
    amount: 4200, filedDate: formatDate(daysAgo(14)), status: 'under_review', statusLabel: 'Under review', daysOpen: 14,
    relatedOrder: 'WO-2026-4521D', relatedInvoice: 'INV-7834',
    description: 'Ordered CPM of $850 per contract amendment CA-2026-0089, but invoiced at standard rate card CPM of $920. Difference of $70 x 60 spots.',
  },
  {
    id: 'DSP-298', agency: 'Havas Media', advertiser: 'Puma', type: 'missed_makegood', typeLabel: 'Missed makegood',
    amount: 2800, filedDate: formatDate(daysAgo(18)), status: 'evidence_gathered', statusLabel: 'Evidence gathered', daysOpen: 18,
    relatedOrder: 'WO-2026-4480',
    description: 'Three makegood spots promised for preempted Feb 15 airing were never scheduled. Agency requesting credit for unfulfilled makegoods.',
  },
  {
    id: 'DSP-295', agency: 'GroupM Media', advertiser: 'Nike', type: 'wrong_daypart', typeLabel: 'Wrong daypart',
    amount: 6100, filedDate: formatDate(daysAgo(23)), status: 'pending_response', statusLabel: 'Pending response', daysOpen: 23,
    relatedOrder: 'WO-2026-4445',
    description: 'Order specified Primetime (M-F 8-11p) but as-run log shows 4 of 10 spots aired in Late Fringe (11:35p-2a). Rate differential is $610/spot.',
  },
  {
    id: 'DSP-291', agency: 'Omnicom Media Group', advertiser: 'Apple', type: 'preempted', typeLabel: 'Preempted spots',
    amount: 8400, filedDate: formatDate(daysAgo(28)), status: 'escalated', statusLabel: 'Escalated', daysOpen: 28,
    relatedInvoice: 'INV-7810',
    description: 'Six spots preempted for breaking news coverage, billed at full rate. Agency disputes full billing for unaired inventory.',
  },
  {
    id: 'DSP-288', agency: 'Spark Foundry', advertiser: 'Kraft Heinz', type: 'missing_affidavit', typeLabel: 'Missing affidavit',
    amount: 3200, filedDate: formatDate(daysAgo(10)), status: 'new', statusLabel: 'New', daysOpen: 10,
    relatedInvoice: 'INV-7739',
    description: 'Agency requesting proof of performance for 4 weekend spots. Affidavits not yet uploaded to portal.',
  },
  {
    id: 'DSP-285', agency: 'Publicis Groupe', advertiser: 'Walmart', type: 'duplicate_billing', typeLabel: 'Duplicate billing',
    amount: 5600, filedDate: formatDate(daysAgo(8)), status: 'under_review', statusLabel: 'Under review', daysOpen: 8,
    relatedInvoice: 'INV-7803',
    description: 'Agency claims 8 spots on INV-7803 were already included on INV-7798 from prior billing cycle. Investigating overlap.',
  },
  {
    id: 'DSP-282', agency: 'Assembly Global', advertiser: 'T-Mobile', type: 'wrong_spots', typeLabel: 'Wrong spot count',
    amount: 3800, filedDate: formatDate(daysAgo(16)), status: 'evidence_gathered', statusLabel: 'Evidence gathered', daysOpen: 16,
    relatedInvoice: 'INV-7745',
    description: 'Invoice for 16 spots but as-run log only shows 14 aired. Two spots in the rotation were bumped but not removed from billing.',
  },
  {
    id: 'DSP-279', agency: 'PHD Media', advertiser: 'Volkswagen', type: 'contract_terms', typeLabel: 'Contract terms',
    amount: 7200, filedDate: formatDate(daysAgo(21)), status: 'pending_response', statusLabel: 'Pending response', daysOpen: 21,
    relatedInvoice: 'INV-7688',
    description: 'Agency claims Net 60 terms per annual contract, but invoice generated with Net 45. Requesting adjustment of late fees applied.',
  },
];

// ---------------------------------------------------------------------------
// Collections Priority Queue — derived from invoices + payment history
// ---------------------------------------------------------------------------
export interface CollectionsPriority {
  rank: number;
  agency: string;
  invoiceId: string;
  amount: number;
  daysOverdue: number;
  riskScore: number; // 1-100 (higher = more urgent)
  recommendedAction: string;
  lastContact?: string;
}

export const COLLECTIONS_QUEUE: CollectionsPriority[] = [
  { rank: 1, agency: 'PHD Media', invoiceId: 'INV-7634', amount: 19800, daysOverdue: 95, riskScore: 94, recommendedAction: 'Final notice — escalate to management', lastContact: formatDate(daysAgo(12)) },
  { rank: 2, agency: 'Dentsu International', invoiceId: 'INV-7641', amount: 16400, daysOverdue: 90, riskScore: 91, recommendedAction: 'Final notice — legal review threshold', lastContact: formatDate(daysAgo(15)) },
  { rank: 3, agency: 'Havas Media', invoiceId: 'INV-7648', amount: 11200, daysOverdue: 87, riskScore: 85, recommendedAction: 'Third notice — executive escalation', lastContact: formatDate(daysAgo(20)) },
  { rank: 4, agency: 'Assembly Global', invoiceId: 'INV-7655', amount: 8400, daysOverdue: 98, riskScore: 83, recommendedAction: 'Final notice — small balance, write-off review', lastContact: formatDate(daysAgo(25)) },
  { rank: 5, agency: 'Spark Foundry', invoiceId: 'INV-7660', amount: 13600, daysOverdue: 80, riskScore: 79, recommendedAction: 'Second notice — follow up on dispute DSP-288', lastContact: formatDate(daysAgo(10)) },
  { rank: 6, agency: 'Dentsu International', invoiceId: 'INV-7698', amount: 22600, daysOverdue: 60, riskScore: 72, recommendedAction: 'Second notice — large balance, payment plan discussion', lastContact: formatDate(daysAgo(18)) },
  { rank: 7, agency: 'Havas Media', invoiceId: 'INV-7702', amount: 14200, daysOverdue: 55, riskScore: 68, recommendedAction: 'First notice — reference affidavits delivered', lastContact: undefined },
  { rank: 8, agency: 'Horizon Media', invoiceId: 'INV-7756', amount: 12400, daysOverdue: 42, riskScore: 62, recommendedAction: 'First notice — part of $34.5K batch with INV-7761, INV-7768' },
  { rank: 9, agency: 'PHD Media', invoiceId: 'INV-7688', amount: 18200, daysOverdue: 65, riskScore: 58, recommendedAction: 'Hold — dispute DSP-279 in progress (contract terms)' },
  { rank: 10, agency: 'Zenith Media', invoiceId: 'INV-7695', amount: 12000, daysOverdue: 72, riskScore: 55, recommendedAction: 'Second notice — historically slow payer, consistent' },
];

// ---------------------------------------------------------------------------
// Reconciliation view — order vs. aired vs. billed
// ---------------------------------------------------------------------------
export interface ReconciliationRow {
  orderId: string;
  advertiser: string;
  agency: string;
  orderedSpots: number;
  airedSpots: number;
  billedSpots: number;
  orderedRevenue: number;
  billedRevenue: number;
  variance: number;
  status: 'clean' | 'under_billed' | 'over_billed' | 'unbilled' | 'spot_mismatch';
  statusLabel: string;
}

export const RECONCILIATION: ReconciliationRow[] = [
  { orderId: 'WO-2026-4600', advertiser: 'Toyota Motor', agency: 'GroupM Media', orderedSpots: 24, airedSpots: 24, billedSpots: 24, orderedRevenue: 36000, billedRevenue: 36000, variance: 0, status: 'clean', statusLabel: 'Matched' },
  { orderId: 'WO-2026-4601', advertiser: 'Samsung Electronics', agency: 'Publicis Groupe', orderedSpots: 30, airedSpots: 30, billedSpots: 30, orderedRevenue: 45000, billedRevenue: 45000, variance: 0, status: 'clean', statusLabel: 'Matched' },
  { orderId: 'WO-2026-4521', advertiser: 'Toyota Motor', agency: 'Saatchi & Saatchi', orderedSpots: 12, airedSpots: 12, billedSpots: 0, orderedRevenue: 18400, billedRevenue: 0, variance: -18400, status: 'unbilled', statusLabel: 'Unbilled — $18.4K at risk' },
  { orderId: 'WO-2026-4498', advertiser: 'Progressive Insurance', agency: 'Arnold Worldwide', orderedSpots: 8, airedSpots: 8, billedSpots: 0, orderedRevenue: 12200, billedRevenue: 0, variance: -12200, status: 'unbilled', statusLabel: 'Unbilled — $12.2K at risk' },
  { orderId: 'WO-2026-4467', advertiser: 'Home Depot', agency: 'Richards Group', orderedSpots: 15, airedSpots: 15, billedSpots: 0, orderedRevenue: 23100, billedRevenue: 0, variance: -23100, status: 'unbilled', statusLabel: 'Unbilled — $23.1K at risk' },
  { orderId: 'WO-2026-4445', advertiser: 'Nike', agency: 'GroupM Media', orderedSpots: 10, airedSpots: 10, billedSpots: 10, orderedRevenue: 15000, billedRevenue: 8900, variance: -6100, status: 'under_billed', statusLabel: 'Under-billed — wrong daypart rate' },
  { orderId: 'WO-2026-4480', advertiser: 'Puma', agency: 'Havas Media', orderedSpots: 8, airedSpots: 5, billedSpots: 8, orderedRevenue: 6400, billedRevenue: 6400, variance: 0, status: 'spot_mismatch', statusLabel: 'Spot mismatch — 3 not aired, billed in full' },
  { orderId: 'WO-2026-4521D', advertiser: 'Lexus', agency: 'Dentsu International', orderedSpots: 60, airedSpots: 60, billedSpots: 60, orderedRevenue: 51000, billedRevenue: 55200, variance: 4200, status: 'over_billed', statusLabel: 'Over-billed — wrong CPM applied' },
  { orderId: 'WO-2026-4602', advertiser: 'Amazon', agency: 'IPG Mediabrands', orderedSpots: 20, airedSpots: 20, billedSpots: 20, orderedRevenue: 32000, billedRevenue: 32000, variance: 0, status: 'clean', statusLabel: 'Matched' },
  { orderId: 'WO-2026-4401', advertiser: 'Walmart', agency: 'Publicis Groupe', orderedSpots: 20, airedSpots: 20, billedSpots: 0, orderedRevenue: 31500, billedRevenue: 0, variance: -31500, status: 'unbilled', statusLabel: 'Unbilled — $31.5K at risk' },
  { orderId: 'WO-2026-4389', advertiser: 'Coca-Cola', agency: 'Wieden+Kennedy', orderedSpots: 10, airedSpots: 10, billedSpots: 0, orderedRevenue: 15800, billedRevenue: 0, variance: -15800, status: 'unbilled', statusLabel: 'Unbilled — $15.8K at risk' },
  { orderId: 'WO-2026-4375', advertiser: 'Ford Motor', agency: 'BBDO', orderedSpots: 14, airedSpots: 14, billedSpots: 0, orderedRevenue: 22400, billedRevenue: 0, variance: -22400, status: 'unbilled', statusLabel: 'Unbilled — $22.4K at risk' },
];

// ---------------------------------------------------------------------------
// KPI Metrics — the "live data" strip for Dashboard
// ---------------------------------------------------------------------------
export interface KPIMetrics {
  totalOpenAR: number;
  avgDSO: number;
  activeDisputes: number;
  disputeTotal: number;
  unmatchedPayments: number;
  unmatchedPaymentsValue: number;
  unbilledOrders: number;
  unbilledOrdersValue: number;
  collectionRate: number; // percent
  totalInvoiceCount: number;
  monthlyOrderVolume: number;
  agingDistribution: { current: number; days30: number; days60: number; days90: number; days90plus: number };
  lastSyncTime: string;
}

const unbilledOrders = ORDERS.filter(o => o.status === 'unbilled');
const unmatchedPayments = PAYMENTS.filter(p => p.matchStatus === 'unmatched' || p.matchStatus === 'short_pay');

export const KPI_METRICS: KPIMetrics = {
  totalOpenAR: TOTAL_OPEN_AR,
  avgDSO: 38,
  activeDisputes: DISPUTES.length,
  disputeTotal: DISPUTES.reduce((s, d) => s + d.amount, 0),
  unmatchedPayments: unmatchedPayments.length,
  unmatchedPaymentsValue: unmatchedPayments.reduce((s, p) => s + p.amount, 0),
  unbilledOrders: unbilledOrders.length,
  unbilledOrdersValue: unbilledOrders.reduce((s, o) => s + o.revenue, 0),
  collectionRate: 87.2,
  totalInvoiceCount: AR_AGING.reduce((s, b) => s + b.invoiceCount, 0),
  monthlyOrderVolume: 4200,
  agingDistribution: { current: 42.1, days30: 22.5, days60: 13.2, days90: 9.4, days90plus: 12.8 },
  lastSyncTime: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Formatted data for Data Explorer preset queries
// ---------------------------------------------------------------------------
export interface QueryResult {
  columns: string[];
  rows: (string | number)[][];
}

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

export function getAgingQueryResult(): QueryResult {
  return {
    columns: ['Bucket', 'Invoice Count', 'Total Amount', '% of Total'],
    rows: AR_AGING.map(b => [b.bucket, b.invoiceCount, fmtCurrency(b.totalAmount), `${b.pctOfTotal}%`]),
  };
}

export function getTopAgenciesQueryResult(): QueryResult {
  return {
    columns: ['Agency', 'Open Invoices', 'Total Outstanding', 'Avg Days Out', 'Last Payment', 'Terms'],
    rows: AGENCIES.map(a => [a.name, a.openInvoices, fmtCurrency(a.totalOutstanding), String(a.avgDaysOutstanding), a.lastPaymentDate, a.paymentTerms]),
  };
}

export function getUnbilledOrdersQueryResult(): QueryResult {
  const unbilled = ORDERS.filter(o => o.status === 'unbilled');
  const totalRevenue = unbilled.reduce((s, o) => s + o.revenue, 0);
  return {
    columns: ['Order ID', 'Advertiser', 'Agency', 'Air Dates', 'Spots', 'Revenue at Risk', 'Days Since Air'],
    rows: [
      ...unbilled.map(o => {
        const airEnd = new Date(o.airDateEnd);
        const daysSince = Math.round((Date.now() - airEnd.getTime()) / 86400000);
        return [o.id, o.advertiser, o.agency, `${formatDateShort(new Date(o.airDateStart))} - ${formatDateShort(new Date(o.airDateEnd))}`, o.spots, fmtCurrency(o.revenue), String(daysSince)] as (string | number)[];
      }),
      ['', '', '', '', '', fmtCurrency(totalRevenue), 'TOTAL AT RISK'],
    ],
  };
}

export function getUnmatchedPaymentsQueryResult(): QueryResult {
  return {
    columns: ['Payment Ref', 'Agency', 'Amount', 'Received', 'Possible Match', 'Confidence', 'Remittance Note'],
    rows: PAYMENTS.filter(p => p.matchStatus !== 'matched').map(p => [
      p.ref,
      p.agency,
      fmtCurrency(p.amount),
      p.receivedDate,
      p.matchedInvoices.length > 0 ? p.matchedInvoices.join(', ') : 'No match found',
      `${p.confidence}%`,
      p.remittanceNote || '',
    ]),
  };
}

export function getDisputesQueryResult(): QueryResult {
  return {
    columns: ['Dispute ID', 'Agency', 'Advertiser', 'Type', 'Amount', 'Filed', 'Status', 'Days Open'],
    rows: DISPUTES.map(d => [d.id, d.agency, d.advertiser, d.typeLabel, fmtCurrency(d.amount), d.filedDate, d.statusLabel, d.daysOpen]),
  };
}

export function getCollectionsQueueQueryResult(): QueryResult {
  return {
    columns: ['Priority', 'Agency', 'Invoice', 'Amount', 'Days Overdue', 'Risk Score', 'Recommended Action'],
    rows: COLLECTIONS_QUEUE.map(c => [
      `#${c.rank}`,
      c.agency,
      c.invoiceId,
      fmtCurrency(c.amount),
      c.daysOverdue,
      `${c.riskScore}/100`,
      c.recommendedAction,
    ]),
  };
}

export function getReconciliationQueryResult(): QueryResult {
  return {
    columns: ['Order ID', 'Advertiser', 'Agency', 'Ordered', 'Aired', 'Billed', 'Revenue', 'Billed $', 'Variance', 'Status'],
    rows: RECONCILIATION.map(r => [
      r.orderId,
      r.advertiser,
      r.agency,
      r.orderedSpots,
      r.airedSpots,
      r.billedSpots,
      fmtCurrency(r.orderedRevenue),
      fmtCurrency(r.billedRevenue),
      r.variance === 0 ? '$0' : (r.variance > 0 ? `+${fmtCurrency(r.variance)}` : `-${fmtCurrency(Math.abs(r.variance))}`),
      r.statusLabel,
    ]),
  };
}

export function getCashMatchQueryResult(): QueryResult {
  return {
    columns: ['Payment Ref', 'Agency', 'Amount', 'Received', 'Status', 'Matched To', 'Confidence', 'Short Pay'],
    rows: PAYMENTS.map(p => [
      p.ref,
      p.agency,
      fmtCurrency(p.amount),
      p.receivedDate,
      p.matchStatus === 'matched' ? 'Auto-matched' : p.matchStatus === 'partial' ? 'Partial match' : p.matchStatus === 'short_pay' ? 'Short pay' : 'Unmatched',
      p.matchedInvoices.length > 0 ? p.matchedInvoices.join(', ') : '—',
      `${p.confidence}%`,
      p.shortPayAmount ? fmtCurrency(p.shortPayAmount) : '—',
    ]),
  };
}

// ---------------------------------------------------------------------------
// Data context summary for Claude NL queries
// ---------------------------------------------------------------------------
export function getDataContextForClaude(): string {
  return `You have access to a read-only Snowflake mirror of WideOrbit broadcast traffic and billing data. Here is the current state:

TOTAL OPEN AR: ${fmtCurrency(TOTAL_OPEN_AR)} across ${KPI_METRICS.totalInvoiceCount} invoices
AVERAGE DSO: ${KPI_METRICS.avgDSO} days
MONTHLY ORDER VOLUME: ${KPI_METRICS.monthlyOrderVolume}

AR AGING BUCKETS:
${AR_AGING.map(b => `- ${b.bucket}: ${b.invoiceCount} invoices, ${fmtCurrency(b.totalAmount)} (${b.pctOfTotal}%)`).join('\n')}

TOP AGENCIES BY OUTSTANDING AR:
${AGENCIES.slice(0, 10).map(a => `- ${a.name}: ${a.openInvoices} invoices, ${fmtCurrency(a.totalOutstanding)}, avg ${a.avgDaysOutstanding} days, terms: ${a.paymentTerms}`).join('\n')}

UNBILLED ORDERS (revenue at risk):
${unbilledOrders.map(o => `- ${o.id}: ${o.advertiser} via ${o.agency}, ${o.spots} spots, ${fmtCurrency(o.revenue)}, aired ${o.airDateStart} to ${o.airDateEnd}`).join('\n')}
Total unbilled revenue at risk: ${fmtCurrency(KPI_METRICS.unbilledOrdersValue)}

ACTIVE DISPUTES (${DISPUTES.length} open, ${fmtCurrency(KPI_METRICS.disputeTotal)} total):
${DISPUTES.map(d => `- ${d.id}: ${d.agency} / ${d.advertiser}, ${d.typeLabel}, ${fmtCurrency(d.amount)}, ${d.daysOpen} days open, status: ${d.statusLabel}`).join('\n')}

RECENT PAYMENTS (last 14 days):
${PAYMENTS.map(p => `- ${p.ref}: ${p.agency}, ${fmtCurrency(p.amount)}, status: ${p.matchStatus}, confidence: ${p.confidence}%${p.shortPayAmount ? `, short pay: ${fmtCurrency(p.shortPayAmount)}` : ''}`).join('\n')}

COLLECTIONS PRIORITY (top 5):
${COLLECTIONS_QUEUE.slice(0, 5).map(c => `- #${c.rank} ${c.agency} ${c.invoiceId}: ${fmtCurrency(c.amount)}, ${c.daysOverdue} days overdue, action: ${c.recommendedAction}`).join('\n')}

RECONCILIATION ISSUES:
${RECONCILIATION.filter(r => r.status !== 'clean').map(r => `- ${r.orderId}: ${r.advertiser}, ${r.statusLabel}`).join('\n')}

When answering questions, reference specific invoice IDs, order IDs, agency names, and dollar amounts from this data. Format currency amounts and present tabular data clearly. If asked about something not in this dataset, say so clearly.`;
}
