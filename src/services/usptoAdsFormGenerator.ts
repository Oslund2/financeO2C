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

  // Secrecy Order Section
  checkPageBreak(80);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Secrecy Order 37 CFR 5.2:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const secrecyText = doc.splitTextToSize(
    'Portions or all of the application associated with this Application Data Sheet may fall under a Secrecy Order pursuant to 37 CFR 5.2 (Paper filers only. Applications that fall under Secrecy Order may not be filed electronically.)',
    contentWidth - 20
  );
  secrecyText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 15;

  // Filing By Reference Section
  checkPageBreak(100);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Filing By Reference:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const filingRefText = doc.splitTextToSize(
    'Only complete this section when filing an application by reference under 35 U.S.C. 111(c) and 37 CFR 1.57(a). Do not complete this section if application papers including a specification and any drawings are being filed. Any domestic benefit or foreign priority information must be provided in the appropriate section(s) below (i.e., "Domestic Benefit/National Stage Information" and "Foreign Priority Information").',
    contentWidth - 20
  );
  filingRefText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 5;
  doc.text('Application number of the previously filed application: _________________', margin + 10, y);
  y += 12;
  doc.text('Filing date (YYYY-MM-DD): _________________', margin + 10, y);
  y += 12;
  doc.text('Intellectual Property Authority or Country: _________________', margin + 10, y);

  y += 20;

  // Publication Information Section
  checkPageBreak(100);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Publication Information:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('☐ Request Early Publication (Fee required at time of Request 37 CFR 1.219)', margin + 10, y);
  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.text('Request Not to Publish.', margin + 10, y);
  doc.setFont('helvetica', 'normal');
  y += 12;
  doc.setFontSize(7);
  const pubText = doc.splitTextToSize(
    'I hereby request that the attached application not be published under 35 U.S.C. 122(b) and certify that the invention disclosed in the attached application has not and will not be the subject of an application filed in another country, or under a multilateral international agreement, that requires publication at',
    contentWidth - 20
  );
  pubText.forEach((line: string) => {
    doc.text(line, margin + 15, y);
    y += 9;
  });

  y += 20;

  // Domestic Benefit/National Stage Information
  checkPageBreak(100);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Domestic Benefit/National Stage Information:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const domesticText = doc.splitTextToSize(
    'This section allows for the applicant to either claim benefit under 35 U.S.C. 119(e), 120, 121, 365(c), or 386(c) or indicate National Stage entry from a PCT application. Providing benefit claim information in the Application Data Sheet constitutes the specific reference required by 35 U.S.C. 119(e) or 120, and 37 CFR 1.78. When referring to the current application, please leave the "Application Number" field blank.',
    contentWidth - 20
  );
  domesticText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 10;
  doc.setFontSize(8);
  if (data.domesticBenefitClaims && data.domesticBenefitClaims.length > 0) {
    data.domesticBenefitClaims.forEach((claim, idx) => {
      checkPageBreak(50);
      doc.setFont('helvetica', 'bold');
      doc.text(`Prior Application ${idx + 1}:`, margin + 10, y);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.text(`Application Number: ${claim.priorApplicationNumber}`, margin + 15, y);
      y += 12;
      doc.text(`Filing Date: ${claim.filingDate}`, margin + 15, y);
      doc.text(`Continuity Type: ${claim.continuityType}`, margin + 250, y);
      y += 15;
    });
  } else {
    doc.text('Application Number: _________________', margin + 15, y);
    y += 12;
    doc.text('Continuity Type: _________________', margin + 15, y);
    y += 12;
    doc.text('Prior Application Number: _________________', margin + 15, y);
    y += 12;
    doc.text('Filing Date (YYYY-MM-DD): _________________', margin + 15, y);
    y += 15;
  }

  y += 15;

  // Foreign Priority Information
  checkPageBreak(100);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Foreign Priority Information:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const foreignText = doc.splitTextToSize(
    'This section allows for the applicant to claim priority to a foreign application. Providing this information in the application data sheet constitutes the claim for priority as required by 35 U.S.C. 119(b) and 37 CFR 1.55.',
    contentWidth - 20
  );
  foreignText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 10;
  doc.setFontSize(8);
  if (data.foreignPriorityClaims && data.foreignPriorityClaims.length > 0) {
    data.foreignPriorityClaims.forEach((claim, idx) => {
      checkPageBreak(40);
      doc.text(`Application Number: ${claim.applicationNumber}`, margin + 15, y);
      doc.text(`Country: ${claim.country}`, margin + 250, y);
      y += 12;
      doc.text(`Filing Date (YYYY-MM-DD): ${claim.filingDate}`, margin + 15, y);
      doc.text(`Access Code: ${claim.accessCode || ''}`, margin + 250, y);
      y += 15;
    });
  } else {
    doc.text('Application Number: _________________', margin + 15, y);
    y += 12;
    doc.text('Country: _________________', margin + 15, y);
    doc.text('Filing Date (YYYY-MM-DD): _________________', margin + 250, y);
    y += 12;
    doc.text('Access Code (if applicable): _________________', margin + 15, y);
    y += 15;
  }

  y += 15;

  // Statement under 37 CFR 1.55 or 1.78 for AIA
  checkPageBreak(50);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Statement under 37 CFR 1.55 or 1.78 for AIA (First Inventor to File) Transition', margin + 3, y + 10);

  y += 25;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('☐ This application (1) claims priority to or the benefit of an application filed before March 16, 2013 and (2)', margin + 10, y);
  y += 9;
  doc.text('also contains, or contained at any time, a claim to a claimed invention that has an effective filing date on or', margin + 15, y);
  y += 9;
  doc.text('after March 16, 2013.', margin + 15, y);

  y += 20;

  // Authorization or Opt-Out Section
  checkPageBreak(150);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Authorization or Opt-Out of Authorization to Permit Access:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const authText1 = doc.splitTextToSize(
    'When this Application Data Sheet is properly signed and filed with the application, applicant has provided written authority to permit a participating foreign intellectual property (IP) office access to the instant application-as-filed (see paragraph A in subsection 1 below) and the European Patent Office (EPO) access to any search results from the instant application (see paragraph B in subsection 1 below).',
    contentWidth - 20
  );
  authText1.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('1. Authorization to Permit Access by a Foreign Intellectual Property Office(s)', margin + 10, y);

  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.text('A. Priority Document Exchange (PDX)', margin + 10, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  y += 10;
  const pdxText = doc.splitTextToSize(
    'Unless box A in subsection 2 (opt-out of authorization) is checked, the undersigned hereby grants the USPTO authority to provide the European Patent Office (EPO), the Japan Patent Office (JPO), the Korean Intellectual Property Office (KIPO), the State Intellectual Property Office of the People\'s Republic of China (SIPO), the World Intellectual Property Organization (WIPO), and any other foreign intellectual property office participating in the USPTO in a bilateral or multilateral priority document exchange agreement in which a foreign application claiming priority to the instant patent application is filed, access to: (1) the instant patent application-as-filed and its related bibliographic data, (2) any foreign or domestic priority or benefit is claimed in the instant application and its related bibliographic data, and (3) the date of filing of this Authorization. See 37 CFR 1.14(h)(1).',
    contentWidth - 20
  );
  pdxText.forEach((line: string) => {
    doc.text(line, margin + 15, y);
    y += 9;
  });

  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('B. Search Results from U.S. Application to EPO', margin + 10, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  y += 10;
  const epoText = doc.splitTextToSize(
    'Unless box B in subsection 2 (opt-out of authorization) is checked, the undersigned hereby grants the USPTO authority to provide the EPO access to the bibliographic data and search results from the instant application when a European patent application claiming priority to the instant patent application is filed. See 37 CFR 1.14(h)(2).',
    contentWidth - 20
  );
  epoText.forEach((line: string) => {
    doc.text(line, margin + 15, y);
    y += 9;
  });

  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('2. Opt-Out of Authorizations to Permit Access by a Foreign Intellectual Property Office(s)', margin + 10, y);

  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('☐ A. Applicant DOES NOT authorize the USPTO to permit a participating foreign IP office access to the instant', margin + 15, y);
  y += 9;
  doc.text('application-as-filed. If this box is checked, the USPTO will not be providing a participating foreign IP office with any', margin + 20, y);
  y += 9;
  doc.text('documents and information identified in subsection 1A above.', margin + 20, y);

  y += 12;

  doc.text('☐ B. Applicant DOES NOT authorize the USPTO to transmit to the EPO any search results from the instant patent', margin + 15, y);
  y += 9;
  doc.text('application. If this box is checked, the USPTO will not be providing the EPO with search results from the instant', margin + 20, y);
  y += 9;
  doc.text('application.', margin + 20, y);

  y += 20;

  // Applicant Information
  checkPageBreak(120);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Applicant Information:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const applicantText = doc.splitTextToSize(
    'Providing assignment information in this section does not substitute for compliance with any requirement of part 3 of Title 37 of CFR to have an assignment recorded by the Office.',
    contentWidth - 20
  );
  applicantText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 10;

  doc.setFontSize(8);
  doc.text('Applicant 1', margin + 10, y);
  y += 15;
  doc.text('☐ Assignee', margin + 15, y);
  doc.text('☐ Legal Representative under 35 U.S.C. 117', margin + 150, y);
  doc.text('☐ Joint Inventor', margin + 350, y);
  y += 12;
  doc.text('☐ Person to whom the inventor is obligated to assign', margin + 15, y);
  y += 12;
  doc.text('☐ Person who shows sufficient proprietary interest', margin + 15, y);
  y += 15;

  doc.text('If the Applicant is an Organization check here. ☐', margin + 10, y);
  y += 12;
  doc.text('Organization Name: _________________', margin + 15, y);
  y += 15;

  doc.text('Given Name: _________________', margin + 15, y);
  doc.text('Middle Name: _________________', margin + 150, y);
  y += 12;
  doc.text('Family Name: _________________', margin + 15, y);
  doc.text('Suffix: _________________', margin + 150, y);

  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.text('Mailing Address Information For Applicant:', margin + 10, y);
  doc.setFont('helvetica', 'normal');
  y += 12;
  doc.text('Address 1: _________________', margin + 15, y);
  y += 12;
  doc.text('Address 2: _________________', margin + 15, y);
  y += 12;
  doc.text('City: _________________', margin + 15, y);
  doc.text('State/Province: _________________', margin + 200, y);
  y += 12;
  doc.text('Country: _________________', margin + 15, y);
  doc.text('Postal Code: _________________', margin + 200, y);
  y += 12;
  doc.text('Phone Number: _________________', margin + 15, y);
  doc.text('Fax Number: _________________', margin + 200, y);
  y += 12;
  doc.text('Email Address: _________________', margin + 15, y);

  y += 20;

  // Assignee Information
  checkPageBreak(100);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Assignee Information including Non-Applicant Assignee Information:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const assigneeText = doc.splitTextToSize(
    'Providing assignment information in this section does not substitute for compliance with any requirement of part 3 of Title 37 of CFR to have an assignment recorded by the Office.',
    contentWidth - 20
  );
  assigneeText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 10;

  doc.setFontSize(8);
  doc.text('Assignee 1', margin + 10, y);
  y += 15;

  doc.text('If the Assignee or Non-Applicant Assignee is an Organization check here. ☐', margin + 15, y);
  y += 12;
  doc.text('Organization Name: _________________', margin + 15, y);
  y += 15;

  doc.text('Given Name: _________________', margin + 15, y);
  doc.text('Middle Name: _________________', margin + 150, y);
  y += 12;
  doc.text('Family Name: _________________', margin + 15, y);
  doc.text('Suffix: _________________', margin + 150, y);

  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.text('Mailing Address Information For Assignee including Non-Applicant Assignee:', margin + 10, y);
  doc.setFont('helvetica', 'normal');
  y += 12;
  doc.text('Address 1: _________________', margin + 15, y);
  y += 12;
  doc.text('Address 2: _________________', margin + 15, y);
  y += 12;
  doc.text('City: _________________', margin + 15, y);
  doc.text('State/Province: _________________', margin + 200, y);
  y += 12;
  doc.text('Country: _________________', margin + 15, y);
  doc.text('Postal Code: _________________', margin + 200, y);
  y += 12;
  doc.text('Phone Number: _________________', margin + 15, y);
  doc.text('Fax Number: _________________', margin + 200, y);
  y += 12;
  doc.text('Email Address: _________________', margin + 15, y);

  y += 20;

  // Signature Section
  checkPageBreak(120);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Signature:', margin + 3, y + 10);

  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const sigNoteText = doc.splitTextToSize(
    'NOTE: This Application Data Sheet must be signed in accordance with 37 CFR 1.33(b). However, if this Application Data Sheet is submitted with the INITIAL filing of the application and either box A or B is not checked in subsection 2 of the "Authorization or Opt-Out of Authorization to Permit Access" section, then this form must also be signed in accordance with 37 CFR 1.14(c).',
    contentWidth - 20
  );
  sigNoteText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 10;

  doc.setFontSize(7);
  const sigText = doc.splitTextToSize(
    'This Application Data Sheet must be signed by a patent practitioner if one or more of the applicants is a juristic entity (e.g., corporation or association). If the applicant is two or more joint inventors, this form must be signed by a patent practitioner, all joint inventors who are the applicant, or one or more joint inventor-applicants who have been given power of attorney (e.g., see USPTO Form PTO/AIA/81) on behalf of all joint inventor-applicants. See 37 CFR 1.4(d) for the manner of making signatures and certifications.',
    contentWidth - 20
  );
  sigText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 15;

  doc.setFontSize(8);
  doc.text('Signature: _______________________________', margin + 10, y);
  doc.text('Date (YYYY-MM-DD): _____________', margin + 320, y);
  y += 15;

  doc.text('First Name: _________________', margin + 10, y);
  doc.text('Last Name: _________________', margin + 180, y);
  y += 12;
  doc.text('Registration Number: _________________', margin + 10, y);

  y += 20;

  // Privacy Act Statement
  checkPageBreak(150);
  doc.setFillColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, 15, 'F');
  doc.rect(margin, y, contentWidth, 15, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Privacy Act Statement', pageWidth / 2, y + 10, { align: 'center' });

  y += 25;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const privacyText = doc.splitTextToSize(
    'The Privacy Act of 1974 (P.L. 93-579) requires that you be given certain information in connection with your submission of the attached form related to a patent application or patent. Accordingly, pursuant to the requirements of the Act, please be advised that: (1) the general authority for the collection of this information is 35 U.S.C. 2(b)(2); (2) furnishing of the information solicited is voluntary; and (3) the principal purpose for which the information is used by the U.S. Patent and Trademark Office is to process and/or examine your submission related to a patent application or patent. If you do not furnish the requested information, the U.S. Patent and Trademark Office may not be able to process and/or examine your submission, which may result in termination of proceedings or abandonment of the application or expiration of the patent.',
    contentWidth - 20
  );
  privacyText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

  y += 10;

  const privacyRoutineText = doc.splitTextToSize(
    'The information provided by you in this form will be subject to the following routine uses: (1) The information on this form will be treated confidentially to the extent allowed under the Freedom of Information Act (5 U.S.C. 552) and the Privacy Act (5 U.S.C. 552a). Records from this system of records may be disclosed to the Department of Justice to determine whether the Freedom of Information Act requires disclosure of these records. (2-9) [Additional routine uses as specified in USPTO SORN-11]',
    contentWidth - 20
  );
  privacyRoutineText.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 9;
  });

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
