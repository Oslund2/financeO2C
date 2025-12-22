import jsPDF from 'jspdf';
import type { PatentApplication, InventorInfo, CorrespondenceAddressInfo, AttorneyInfoData } from './patentApplicationService';

export interface SB16FormData {
  inventionTitle: string;
  inventors: InventorInfo[];
  correspondenceAddress: CorrespondenceAddressInfo | null;
  attorneyInfo: AttorneyInfoData | null;
  entityStatus: 'regular' | 'small_entity' | 'micro_entity';
  governmentInterest: string | null;
  docketNumber?: string;
  numberOfPages?: number;
  numberOfDrawingSheets?: number;
}

export function extractSB16DataFromApplication(application: PatentApplication): SB16FormData {
  return {
    inventionTitle: application.title,
    inventors: application.inventors || [],
    correspondenceAddress: application.correspondence_address,
    attorneyInfo: application.attorney_info,
    entityStatus: application.entity_status,
    governmentInterest: application.government_interest,
    docketNumber: (application.metadata as Record<string, string>)?.docket_number || '',
    numberOfPages: undefined,
    numberOfDrawingSheets: undefined
  };
}

export function generateSB16CoverSheet(data: SB16FormData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let y = 50;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PTO/SB/16 (01-22)', pageWidth - margin, y, { align: 'right' });
  doc.text('Approved for use through 01/31/2025. OMB 0651-0032', pageWidth - margin, y + 12, { align: 'right' });
  doc.text('U.S. Patent and Trademark Office; U.S. DEPARTMENT OF COMMERCE', pageWidth - margin, y + 24, { align: 'right' });

  y += 50;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PROVISIONAL APPLICATION FOR PATENT COVER SHEET', pageWidth / 2, y, { align: 'center' });

  y += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a request for filing a PROVISIONAL APPLICATION FOR PATENT under 37 CFR 1.53(c).', pageWidth / 2, y, { align: 'center' });

  y += 30;

  y = drawSectionHeader(doc, 'INVENTOR(S)', margin, y, contentWidth);
  y += 5;

  if (data.inventors.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('No inventors listed. At least one inventor is required.', margin + 10, y);
    y += 20;
  } else {
    data.inventors.forEach((inventor, index) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      y = drawInventorBlock(doc, inventor, index + 1, margin, y, contentWidth);
      y += 10;
    });
  }

  y += 10;

  y = drawSectionHeader(doc, 'TITLE OF THE INVENTION (500 characters max)', margin, y, contentWidth);
  y += 5;

  const titleLines = doc.splitTextToSize(data.inventionTitle || 'Untitled', contentWidth - 20);
  doc.setFont('helvetica', 'normal');
  titleLines.forEach((line: string) => {
    doc.text(line, margin + 10, y);
    y += 14;
  });

  y += 15;

  y = drawSectionHeader(doc, 'CORRESPONDENCE ADDRESS', margin, y, contentWidth);
  y += 5;

  if (data.correspondenceAddress) {
    const addr = data.correspondenceAddress;
    doc.setFont('helvetica', 'normal');

    if (addr.name) {
      doc.text(`Attention: ${addr.name}`, margin + 10, y);
      y += 14;
    }
    doc.text(addr.street || '', margin + 10, y);
    y += 14;
    doc.text(`${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`, margin + 10, y);
    y += 14;
    doc.text(addr.country || 'United States', margin + 10, y);
    y += 14;

    if (addr.phone) {
      doc.text(`Telephone: ${addr.phone}`, margin + 10, y);
      y += 14;
    }
    if (addr.email) {
      doc.text(`Email: ${addr.email}`, margin + 10, y);
      y += 14;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.text('No correspondence address provided.', margin + 10, y);
    y += 14;
  }

  y += 15;

  if (y > 650) {
    doc.addPage();
    y = 50;
  }

  y = drawSectionHeader(doc, 'APPLICATION ELEMENTS', margin, y, contentWidth);
  y += 5;

  doc.setFont('helvetica', 'normal');
  const checkboxSize = 10;

  doc.rect(margin + 10, y - 8, checkboxSize, checkboxSize);
  doc.text('X', margin + 12, y);
  doc.text('Specification (description of the invention)', margin + 30, y);
  y += 18;

  doc.rect(margin + 10, y - 8, checkboxSize, checkboxSize);
  doc.text('X', margin + 12, y);
  doc.text('Drawing(s) (if applicable)', margin + 30, y);
  y += 18;

  const numPages = data.numberOfPages || '____';
  const numDrawings = data.numberOfDrawingSheets || '____';
  doc.text(`Number of pages: ${numPages}     Number of drawing sheets: ${numDrawings}`, margin + 30, y);

  y += 25;

  y = drawSectionHeader(doc, 'ENTITY STATUS', margin, y, contentWidth);
  y += 5;

  doc.setFont('helvetica', 'normal');

  doc.rect(margin + 10, y - 8, checkboxSize, checkboxSize);
  if (data.entityStatus === 'small_entity') {
    doc.text('X', margin + 12, y);
  }
  doc.text('Applicant claims small entity status. See 37 CFR 1.27', margin + 30, y);
  y += 18;

  doc.rect(margin + 10, y - 8, checkboxSize, checkboxSize);
  if (data.entityStatus === 'micro_entity') {
    doc.text('X', margin + 12, y);
  }
  doc.text('Applicant claims micro entity status. See 37 CFR 1.29 (Applicant must attach form PTO/SB/15A or B)', margin + 30, y);
  y += 18;

  if (data.entityStatus === 'regular') {
    doc.setFont('helvetica', 'italic');
    doc.text('(No entity status claimed - regular entity fees apply)', margin + 30, y);
    y += 18;
  }

  y += 10;

  if (y > 650) {
    doc.addPage();
    y = 50;
  }

  y = drawSectionHeader(doc, 'GOVERNMENT INTEREST', margin, y, contentWidth);
  y += 5;

  doc.setFont('helvetica', 'normal');

  const hasGovInterest = data.governmentInterest && data.governmentInterest.trim().length > 0;

  doc.rect(margin + 10, y - 8, checkboxSize, checkboxSize);
  if (!hasGovInterest) {
    doc.text('X', margin + 12, y);
  }
  doc.text('No - The invention was not made by a U.S. Government agency or under contract.', margin + 30, y);
  y += 18;

  doc.rect(margin + 10, y - 8, checkboxSize, checkboxSize);
  if (hasGovInterest) {
    doc.text('X', margin + 12, y);
  }
  doc.text('Yes - The invention was made by or under contract with a U.S. Government agency:', margin + 30, y);
  y += 14;

  if (hasGovInterest) {
    const govLines = doc.splitTextToSize(data.governmentInterest!, contentWidth - 50);
    govLines.forEach((line: string) => {
      doc.text(line, margin + 40, y);
      y += 14;
    });
  }

  y += 20;

  if (data.attorneyInfo && (data.attorneyInfo.name || data.attorneyInfo.registrationNumber)) {
    y = drawSectionHeader(doc, 'ATTORNEY/AGENT INFORMATION (if applicable)', margin, y, contentWidth);
    y += 5;

    doc.setFont('helvetica', 'normal');
    if (data.attorneyInfo.name) {
      doc.text(`Name: ${data.attorneyInfo.name}`, margin + 10, y);
      y += 14;
    }
    if (data.attorneyInfo.registrationNumber) {
      doc.text(`Registration Number: ${data.attorneyInfo.registrationNumber}`, margin + 10, y);
      y += 14;
    }
    if (data.attorneyInfo.firm) {
      doc.text(`Firm: ${data.attorneyInfo.firm}`, margin + 10, y);
      y += 14;
    }
    y += 10;
  }

  if (data.docketNumber) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Attorney Docket Number: ${data.docketNumber}`, margin, y);
    y += 20;
  }

  if (y > 600) {
    doc.addPage();
    y = 50;
  }

  y = drawSectionHeader(doc, 'SIGNATURE', margin, y, contentWidth);
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.text('Signature: _____________________________________________', margin + 10, y);
  y += 25;

  doc.text('Name (Print): _____________________________________________', margin + 10, y);
  y += 25;

  doc.text(`Date: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`, margin + 10, y);
  y += 25;

  doc.text('Registration Number (if applicable): _________________________', margin + 10, y);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 30, { align: 'center' });

    doc.setFontSize(8);
    doc.text(
      'Under the Paperwork Reduction Act of 1995, no persons are required to respond to a collection of information unless it contains a valid OMB control number.',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 15,
      { align: 'center' }
    );
  }

  return doc;
}

function drawSectionHeader(doc: jsPDF, title: string, x: number, y: number, width: number): number {
  doc.setFillColor(240, 240, 240);
  doc.rect(x, y - 12, width, 16, 'F');
  doc.setDrawColor(180, 180, 180);
  doc.rect(x, y - 12, width, 16, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, x + 5, y);

  return y + 15;
}

function drawInventorBlock(doc: jsPDF, inventor: InventorInfo, index: number, x: number, y: number, width: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Inventor ${index}:`, x + 10, y);
  y += 14;

  doc.setFont('helvetica', 'normal');

  const nameParts = inventor.fullName.split(' ');
  const familyName = nameParts.pop() || '';
  const givenName = nameParts.join(' ');

  doc.text(`Given Name: ${givenName}`, x + 20, y);
  doc.text(`Family Name: ${familyName}`, x + 250, y);
  y += 14;

  const residence = inventor.residence || { city: '', state: '', country: '' };
  doc.text(`Residence: ${residence.city}, ${residence.state}, ${residence.country}`, x + 20, y);
  y += 14;

  if (inventor.citizenship) {
    doc.text(`Citizenship: ${inventor.citizenship}`, x + 20, y);
    y += 14;
  }

  if (inventor.mailingAddress) {
    const addr = inventor.mailingAddress;
    doc.text(`Mailing Address: ${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`, x + 20, y);
    y += 14;
  }

  return y;
}

export function downloadSB16Form(application: PatentApplication): void {
  const data = extractSB16DataFromApplication(application);
  const doc = generateSB16CoverSheet(data);

  const safeTitle = application.title
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  doc.save(`USPTO_SB16_${safeTitle}.pdf`);
}

export function getSB16FormAsBlob(application: PatentApplication): Blob {
  const data = extractSB16DataFromApplication(application);
  const doc = generateSB16CoverSheet(data);
  return doc.output('blob');
}
