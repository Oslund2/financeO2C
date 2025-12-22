import jsPDF from 'jspdf';
import type { PatentApplication, InventorInfo, CorrespondenceAddressInfo, AttorneyInfoData } from './patentApplicationService';

/**
 * USPTO Application Data Sheet (ADS) Form PTO/AIA/14 (01-22)
 * Complete bibliographic data for electronic filing through USPTO Patent Center
 */

export interface ADSFormData {
  // Application Information
  inventionTitle: string;
  attorneyDocketNumber?: string;
  applicationType: 'provisional' | 'non_provisional';
  subjectMatter: 'utility' | 'design' | 'plant';
  totalDrawingSheets: number;
  suggestedPublicationFigure?: number;

  // Inventor Information
  inventors: ADSInventorInfo[];

  // Correspondence Address
  correspondenceAddress: ADSCorrespondenceAddress;

  // Entity Status
  entityStatus: 'regular' | 'small_entity' | 'micro_entity';

  // Representative Information (Optional)
  representativeInfo?: ADSRepresentativeInfo;

  // Application Elements
  hasSpecification: boolean;
  hasDrawings: boolean;
  numberOfPages?: number;
  numberOfDrawingSheets?: number;

  // Domestic Benefit/National Stage (Optional)
  domesticBenefitClaims?: DomesticBenefitClaim[];

  // Foreign Priority (Optional)
  foreignPriorityClaims?: ForeignPriorityClaim[];

  // Government Interest
  governmentInterest?: string;

  // Applicant Information (usually same as inventors for individual filings)
  applicants?: ADSApplicantInfo[];

  // Assignee Information (Optional)
  assignees?: ADSAssigneeInfo[];
}

export interface ADSInventorInfo {
  prefix?: string; // Dr., Mr., Ms., etc.
  givenName: string; // First name
  middleName?: string;
  familyName: string; // Last name
  suffix?: string; // Jr., Sr., III, etc.

  // Residence Information
  residenceCity: string;
  residenceState?: string;
  residenceCountry: string;

  // Citizenship
  citizenship: string;

  // Mailing Address (Optional)
  mailingAddress?: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
}

export interface ADSCorrespondenceAddress {
  customerNumber?: string; // USPTO customer number if registered
  name?: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  telephone?: string;
  email?: string;
}

export interface ADSRepresentativeInfo {
  registrationNumber?: string;
  givenName?: string;
  familyName?: string;
  firmName?: string;
}

export interface DomesticBenefitClaim {
  priorApplicationNumber: string;
  filingDate: string; // YYYY-MM-DD format
  patentNumber?: string;
  issueDate?: string; // YYYY-MM-DD format
  continuityType: 'continuation' | 'divisional' | 'continuation_in_part' | 'provisional';
}

export interface ForeignPriorityClaim {
  applicationNumber: string;
  country: string; // Two-letter country code
  filingDate: string; // YYYY-MM-DD format
  accessCode?: string; // For Priority Document Exchange
}

export interface ADSApplicantInfo {
  type: 'inventor' | 'legal_representative' | 'assignee';
  name: string;
  isOrganization: boolean;
}

export interface ADSAssigneeInfo {
  name: string;
  isOrganization: boolean;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Parse inventor name into ADS format components
 */
export function parseInventorName(fullName: string): Partial<ADSInventorInfo> {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 0) {
    return { givenName: '', familyName: '' };
  }

  if (parts.length === 1) {
    return { givenName: parts[0], familyName: '' };
  }

  // Check for prefix (Dr., Mr., Ms., Mrs.)
  const prefixes = ['Dr.', 'Dr', 'Mr.', 'Mr', 'Ms.', 'Ms', 'Mrs.', 'Mrs'];
  let prefix: string | undefined;
  let nameStart = 0;

  if (prefixes.includes(parts[0])) {
    prefix = parts[0];
    nameStart = 1;
  }

  // Check for suffix (Jr., Sr., II, III, IV)
  const suffixes = ['Jr.', 'Jr', 'Sr.', 'Sr', 'II', 'III', 'IV', 'V', 'Esq.', 'Esq'];
  let suffix: string | undefined;
  let nameEnd = parts.length;

  if (suffixes.includes(parts[parts.length - 1])) {
    suffix = parts[parts.length - 1];
    nameEnd = parts.length - 1;
  }

  // Remaining parts: Given [Middle] Family
  const nameParts = parts.slice(nameStart, nameEnd);

  if (nameParts.length === 1) {
    return { prefix, givenName: nameParts[0], familyName: '', suffix };
  }

  if (nameParts.length === 2) {
    return {
      prefix,
      givenName: nameParts[0],
      familyName: nameParts[1],
      suffix
    };
  }

  // 3 or more parts: First Middle(s) Last
  return {
    prefix,
    givenName: nameParts[0],
    middleName: nameParts.slice(1, -1).join(' '),
    familyName: nameParts[nameParts.length - 1],
    suffix
  };
}

/**
 * Convert application data to ADS form format
 */
export function extractADSDataFromApplication(application: PatentApplication): ADSFormData {
  // Convert inventors to ADS format
  const adsInventors: ADSInventorInfo[] = (application.inventors || []).map(inv => {
    const parsedName = parseInventorName(inv.fullName);

    return {
      ...parsedName,
      givenName: parsedName.givenName || '',
      familyName: parsedName.familyName || '',
      residenceCity: inv.residence?.city || '',
      residenceState: inv.residence?.state,
      residenceCountry: inv.residence?.country || 'US',
      citizenship: inv.citizenship || 'US Citizen',
      mailingAddress: inv.mailingAddress ? {
        street: inv.mailingAddress.street,
        city: inv.mailingAddress.city,
        state: inv.mailingAddress.state,
        postalCode: inv.mailingAddress.zipCode,
        country: inv.mailingAddress.country
      } : undefined
    } as ADSInventorInfo;
  });

  // Convert correspondence address
  const adsCorrespondence: ADSCorrespondenceAddress = {
    name: application.correspondence_address?.name,
    street: application.correspondence_address?.street || '',
    city: application.correspondence_address?.city || '',
    state: application.correspondence_address?.state,
    postalCode: application.correspondence_address?.zipCode || '',
    country: application.correspondence_address?.country || 'US',
    telephone: application.correspondence_address?.phone,
    email: application.correspondence_address?.email
  };

  // Convert representative info if present
  let representativeInfo: ADSRepresentativeInfo | undefined;
  if (application.attorney_info && (application.attorney_info.name || application.attorney_info.registrationNumber)) {
    const attorneyName = parseInventorName(application.attorney_info.name || '');
    representativeInfo = {
      registrationNumber: application.attorney_info.registrationNumber,
      givenName: attorneyName.givenName,
      familyName: attorneyName.familyName,
      firmName: application.attorney_info.firm
    };
  }

  return {
    inventionTitle: application.title,
    attorneyDocketNumber: (application as any).attorney_docket_number,
    applicationType: application.filing_type === 'provisional' ? 'provisional' : 'non_provisional',
    subjectMatter: 'utility',
    totalDrawingSheets: (application as any).number_of_drawing_sheets || 0,
    suggestedPublicationFigure: (application as any).suggested_publication_figure || 1,

    inventors: adsInventors,
    correspondenceAddress: adsCorrespondence,
    entityStatus: application.entity_status,
    representativeInfo,

    hasSpecification: !!application.specification,
    hasDrawings: (application as any).number_of_drawing_sheets > 0,
    numberOfPages: (application as any).number_of_pages,
    numberOfDrawingSheets: (application as any).number_of_drawing_sheets,

    domesticBenefitClaims: (application as any).domestic_benefit_claims || [],
    foreignPriorityClaims: application.foreign_priority_claims || [],
    governmentInterest: application.government_interest,

    applicants: undefined,
    assignees: undefined
  };
}

/**
 * Generate USPTO Application Data Sheet PDF (Form PTO/AIA/14)
 */
export function generateADSForm(data: ADSFormData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let y = 40;

  // Helper function to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 60) {
      doc.addPage();
      y = 50;
      return true;
    }
    return false;
  };

  // Header with form information
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PTO/AIA/14 (01-22)', pageWidth - margin, y, { align: 'right' });
  y += 10;
  doc.text('Approved for use through 05/31/2024. OMB 0651-0032', pageWidth - margin, y, { align: 'right' });
  y += 10;
  doc.text('U.S. Patent and Trademark Office; U.S. DEPARTMENT OF COMMERCE', pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.setFontSize(7);
  doc.text('Under the Paperwork Reduction Act of 1995, no persons are required to respond to a collection', pageWidth - margin, y, { align: 'right' });
  y += 8;
  doc.text('of information unless it contains a valid OMB control number.', pageWidth - margin, y, { align: 'right' });

  y = 50;

  // Title Section
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 20, 'F');
  doc.setDrawColor(100, 100, 100);
  doc.rect(margin, y, contentWidth, 20, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Application Data Sheet 37 CFR 1.76', margin + 5, y + 13);

  y += 25;

  // Attorney Docket Number and Application Number boxes
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin, y, contentWidth / 2 - 5, 15, 'S');
  doc.text('Attorney Docket Number', margin + 3, y + 10);

  doc.rect(margin + contentWidth / 2 + 5, y, contentWidth / 2 - 5, 15, 'S');
  doc.text('Application Number', margin + contentWidth / 2 + 8, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.rect(margin, y, contentWidth / 2 - 5, 15, 'S');
  if (data.attorneyDocketNumber) {
    doc.text(data.attorneyDocketNumber, margin + 3, y + 10);
  }

  doc.rect(margin + contentWidth / 2 + 5, y, contentWidth / 2 - 5, 15, 'S');

  y += 20;

  // Title of Invention
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('Title of Invention', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  const titleLines = doc.splitTextToSize(data.inventionTitle, contentWidth - 10);
  titleLines.forEach((line: string) => {
    checkPageBreak(15);
    doc.text(line, margin + 3, y);
    y += 12;
  });

  y += 10;

  // Inventor Information Section
  checkPageBreak(80);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text('Inventor Information:', margin + 3, y + 10);

  y += 20;

  data.inventors.forEach((inventor, idx) => {
    checkPageBreak(100);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Inventor ${idx + 1}:`, margin + 5, y);
    y += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Legal Name
    doc.setFont('helvetica', 'bold');
    doc.text('Legal Name', margin + 10, y);
    doc.setFont('helvetica', 'normal');
    y += 12;

    const nameRow = [
      inventor.prefix || '',
      inventor.givenName,
      inventor.middleName || '',
      inventor.familyName,
      inventor.suffix || ''
    ].filter(p => p).join(' ');

    doc.text(`Prefix: ${inventor.prefix || ''}`, margin + 15, y);
    doc.text(`Given Name: ${inventor.givenName}`, margin + 100, y);
    doc.text(`Middle Name: ${inventor.middleName || ''}`, margin + 250, y);
    y += 12;
    doc.text(`Family Name: ${inventor.familyName}`, margin + 15, y);
    doc.text(`Suffix: ${inventor.suffix || ''}`, margin + 250, y);
    y += 15;

    // Residence Information
    doc.setFont('helvetica', 'bold');
    doc.text('Residence Information', margin + 10, y);
    doc.setFont('helvetica', 'normal');
    y += 12;

    doc.text(`City: ${inventor.residenceCity}`, margin + 15, y);
    doc.text(`State/Province: ${inventor.residenceState || ''}`, margin + 200, y);
    y += 12;
    doc.text(`Country of Residence: ${inventor.residenceCountry}`, margin + 15, y);
    y += 15;

    // Mailing Address (if provided)
    if (inventor.mailingAddress) {
      doc.setFont('helvetica', 'bold');
      doc.text('Mailing Address of Inventor:', margin + 10, y);
      doc.setFont('helvetica', 'normal');
      y += 12;
      doc.text(`Address: ${inventor.mailingAddress.street}`, margin + 15, y);
      y += 12;
      doc.text(`City: ${inventor.mailingAddress.city}`, margin + 15, y);
      doc.text(`State: ${inventor.mailingAddress.state || ''}`, margin + 200, y);
      y += 12;
      doc.text(`Postal Code: ${inventor.mailingAddress.postalCode || ''}`, margin + 15, y);
      doc.text(`Country: ${inventor.mailingAddress.country}`, margin + 200, y);
      y += 15;
    }

    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  });

  // Correspondence Information
  checkPageBreak(100);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Correspondence Information:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('☑ An Address is being provided for the correspondence Information of this application.', margin + 5, y);
  y += 15;

  if (data.correspondenceAddress.customerNumber) {
    doc.text(`Customer Number: ${data.correspondenceAddress.customerNumber}`, margin + 10, y);
    y += 12;
  }

  if (data.correspondenceAddress.name) {
    doc.text(`Name: ${data.correspondenceAddress.name}`, margin + 10, y);
    y += 12;
  }

  doc.text(`Address: ${data.correspondenceAddress.street}`, margin + 10, y);
  y += 12;
  doc.text(`City: ${data.correspondenceAddress.city}`, margin + 10, y);
  doc.text(`State/Province: ${data.correspondenceAddress.state || ''}`, margin + 250, y);
  y += 12;
  doc.text(`Country: ${data.correspondenceAddress.country}`, margin + 10, y);
  doc.text(`Postal Code: ${data.correspondenceAddress.postalCode}`, margin + 250, y);
  y += 12;

  if (data.correspondenceAddress.telephone) {
    doc.text(`Phone Number: ${data.correspondenceAddress.telephone}`, margin + 10, y);
    y += 12;
  }

  if (data.correspondenceAddress.email) {
    doc.text(`Email Address: ${data.correspondenceAddress.email}`, margin + 10, y);
    y += 12;
  }

  y += 15;

  // Application Information
  checkPageBreak(100);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Application Information:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Application Type: ${data.applicationType === 'provisional' ? 'Provisional' : 'Non-Provisional'}`, margin + 10, y);
  y += 12;
  doc.text(`Subject Matter: ${data.subjectMatter.charAt(0).toUpperCase() + data.subjectMatter.slice(1)}`, margin + 10, y);
  y += 12;

  if (data.numberOfDrawingSheets !== undefined && data.numberOfDrawingSheets > 0) {
    doc.text(`Total Number of Drawing Sheets (if any): ${data.numberOfDrawingSheets}`, margin + 10, y);
    y += 12;
  }

  if (data.suggestedPublicationFigure) {
    doc.text(`Suggested Figure for Publication (if any): ${data.suggestedPublicationFigure}`, margin + 10, y);
    y += 12;
  }

  y += 15;

  // Representative Information (if provided)
  if (data.representativeInfo && (data.representativeInfo.registrationNumber || data.representativeInfo.familyName)) {
    checkPageBreak(80);
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, y, contentWidth, 15, 'F');
    doc.rect(margin, y, contentWidth, 15, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Representative Information:', margin + 3, y + 10);

    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    if (data.representativeInfo.registrationNumber) {
      doc.text(`Registration Number: ${data.representativeInfo.registrationNumber}`, margin + 10, y);
      y += 12;
    }

    if (data.representativeInfo.givenName || data.representativeInfo.familyName) {
      doc.text(`Given Name: ${data.representativeInfo.givenName || ''}`, margin + 10, y);
      doc.text(`Family Name: ${data.representativeInfo.familyName || ''}`, margin + 250, y);
      y += 12;
    }

    if (data.representativeInfo.firmName) {
      doc.text(`Firm: ${data.representativeInfo.firmName}`, margin + 10, y);
      y += 12;
    }

    y += 15;
  }

  // Entity Status
  checkPageBreak(60);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Small Entity Status Claimed', margin + 3, y + 10);
  doc.text(data.entityStatus === 'small_entity' || data.entityStatus === 'micro_entity' ? '☑' : '☐',
    pageWidth - margin - 20, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (data.entityStatus === 'small_entity') {
    doc.text('☑ Small Entity (37 CFR 1.27)', margin + 10, y);
  } else if (data.entityStatus === 'micro_entity') {
    doc.text('☑ Micro Entity (37 CFR 1.29)', margin + 10, y);
  } else {
    doc.text('☐ Regular Entity (No small entity status claimed)', margin + 10, y);
  }

  y += 25;

  // Add page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `EFS Web 2.2.13`,
      margin,
      pageHeight - 30
    );
  }

  return doc;
}

/**
 * Download ADS form as PDF
 */
export function downloadADSForm(application: PatentApplication): void {
  const data = extractADSDataFromApplication(application);
  const doc = generateADSForm(data);

  const safeTitle = application.title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  doc.save(`USPTO_ADS_${safeTitle}.pdf`);
}

/**
 * Get ADS form as Blob for upload or storage
 */
export function getADSFormAsBlob(application: PatentApplication): Blob {
  const data = extractADSDataFromApplication(application);
  const doc = generateADSForm(data);
  return doc.output('blob');
}
