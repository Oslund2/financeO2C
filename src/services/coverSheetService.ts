import jsPDF from 'jspdf';
import type { EntityStatus } from './filingFeeService';

export interface Inventor {
  id: string;
  fullName: string;
  residence: {
    city: string;
    state: string;
    country: string;
  };
  citizenship: string;
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface CorrespondenceAddress {
  name?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface AttorneyInfo {
  name?: string;
  registrationNumber?: string;
  firm?: string;
}

export interface CoverSheetData {
  title: string;
  inventors: Inventor[];
  correspondenceAddress: CorrespondenceAddress;
  attorneyInfo?: AttorneyInfo;
  entityStatus: EntityStatus;
  governmentInterest?: string;
  filingDate?: Date;
}

export function generateCoverSheetHTML(data: CoverSheetData): string {
  const inventorRows = data.inventors.map((inv, idx) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #000;">${idx + 1}</td>
      <td style="padding: 8px; border: 1px solid #000;">${inv.fullName}</td>
      <td style="padding: 8px; border: 1px solid #000;">${inv.residence.city}, ${inv.residence.state}, ${inv.residence.country}</td>
      <td style="padding: 8px; border: 1px solid #000;">${inv.citizenship}</td>
    </tr>
  `).join('');

  const entityCheckboxes = `
    <div style="margin: 10px 0;">
      <label style="margin-right: 20px;">
        <input type="checkbox" ${data.entityStatus === 'regular' ? 'checked' : ''} disabled /> Regular Entity
      </label>
      <label style="margin-right: 20px;">
        <input type="checkbox" ${data.entityStatus === 'small_entity' ? 'checked' : ''} disabled /> Small Entity (37 CFR 1.27)
      </label>
      <label>
        <input type="checkbox" ${data.entityStatus === 'micro_entity' ? 'checked' : ''} disabled /> Micro Entity (37 CFR 1.29)
      </label>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Provisional Application for Patent Cover Sheet</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; margin: 40px; line-height: 1.4; }
    h1 { text-align: center; font-size: 14pt; margin-bottom: 5px; }
    h2 { text-align: center; font-size: 12pt; margin-top: 0; color: #333; }
    .form-number { text-align: right; font-size: 10pt; margin-bottom: 20px; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: #f0f0f0; padding: 8px; border: 1px solid #000; text-align: left; }
    td { padding: 8px; border: 1px solid #000; }
    .field { margin: 10px 0; }
    .field-label { font-weight: bold; }
    .field-value { border-bottom: 1px solid #000; min-height: 20px; padding: 2px 5px; }
    .checkbox-group { margin: 10px 0; }
    .notice { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; margin: 15px 0; font-size: 10pt; }
    .signature-section { margin-top: 40px; }
    .signature-line { border-bottom: 1px solid #000; width: 300px; margin: 30px 0 5px 0; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <div class="form-number">
    <strong>PTO/SB/16</strong><br/>
    Doc Code: PROVAPP
  </div>

  <h1>PROVISIONAL APPLICATION FOR PATENT COVER SHEET</h1>
  <h2>This is a request for filing a PROVISIONAL APPLICATION FOR PATENT under 37 CFR 1.53(c)</h2>

  <div class="notice">
    <strong>NOTICE:</strong> This form must be filed with a specification as required by 35 U.S.C. 112(a),
    claims (optional), drawings (if necessary), and the required filing fee.
  </div>

  <div class="section">
    <div class="section-title">INVENTION TITLE</div>
    <div class="field-value" style="font-size: 12pt; font-weight: bold;">${data.title}</div>
  </div>

  <div class="section">
    <div class="section-title">INVENTOR(S)</div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Full Name (First, Middle, Last)</th>
          <th>Residence (City, State/Province, Country)</th>
          <th>Citizenship</th>
        </tr>
      </thead>
      <tbody>
        ${inventorRows}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">CORRESPONDENCE ADDRESS</div>
    <div class="field">
      <span class="field-label">Name:</span>
      <span class="field-value">${data.correspondenceAddress.name || ''}</span>
    </div>
    <div class="field">
      <span class="field-label">Address:</span>
      <span class="field-value">${data.correspondenceAddress.street}</span>
    </div>
    <div class="field">
      <span class="field-label">City/State/Zip:</span>
      <span class="field-value">${data.correspondenceAddress.city}, ${data.correspondenceAddress.state} ${data.correspondenceAddress.zipCode}</span>
    </div>
    <div class="field">
      <span class="field-label">Country:</span>
      <span class="field-value">${data.correspondenceAddress.country}</span>
    </div>
    ${data.correspondenceAddress.phone ? `
    <div class="field">
      <span class="field-label">Telephone:</span>
      <span class="field-value">${data.correspondenceAddress.phone}</span>
    </div>
    ` : ''}
    ${data.correspondenceAddress.email ? `
    <div class="field">
      <span class="field-label">Email:</span>
      <span class="field-value">${data.correspondenceAddress.email}</span>
    </div>
    ` : ''}
  </div>

  ${data.attorneyInfo?.name ? `
  <div class="section">
    <div class="section-title">ATTORNEY/AGENT INFORMATION (Optional)</div>
    <div class="field">
      <span class="field-label">Name:</span>
      <span class="field-value">${data.attorneyInfo.name}</span>
    </div>
    ${data.attorneyInfo.registrationNumber ? `
    <div class="field">
      <span class="field-label">Registration Number:</span>
      <span class="field-value">${data.attorneyInfo.registrationNumber}</span>
    </div>
    ` : ''}
    ${data.attorneyInfo.firm ? `
    <div class="field">
      <span class="field-label">Firm:</span>
      <span class="field-value">${data.attorneyInfo.firm}</span>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">ENTITY STATUS</div>
    ${entityCheckboxes}
    <p style="font-size: 9pt; color: #666;">
      Applicant certifies that they qualify for the indicated entity status.
      Small entity status is available under 37 CFR 1.27. Micro entity status requires
      certification under 37 CFR 1.29 (Form PTO/SB/15A or 15B).
    </p>
  </div>

  ${data.governmentInterest ? `
  <div class="section">
    <div class="section-title">GOVERNMENT INTEREST</div>
    <p>This invention was made with government support under:</p>
    <div class="field-value">${data.governmentInterest}</div>
    <p style="font-size: 9pt;">The government has certain rights in the invention.</p>
  </div>
  ` : ''}

  <div class="section signature-section">
    <div class="section-title">SIGNATURE</div>
    <p>I hereby declare that all statements made herein of my own knowledge are true and that all
    statements made on information and belief are believed to be true.</p>

    <div class="signature-line"></div>
    <div>Signature of Applicant or Attorney/Agent</div>

    <div style="margin-top: 20px;">
      <span class="field-label">Name (Printed):</span>
      <span class="field-value" style="width: 250px; display: inline-block;"></span>
    </div>

    <div style="margin-top: 10px;">
      <span class="field-label">Date:</span>
      <span class="field-value" style="width: 150px; display: inline-block;">
        ${data.filingDate ? data.filingDate.toLocaleDateString() : ''}
      </span>
    </div>
  </div>

  <div style="margin-top: 40px; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
    <p><strong>Privacy Act Statement:</strong> The Privacy Act of 1974 (P.L. 93-579) requires that you be given
    certain information in connection with your submission of the attached form related to a patent application
    or patent. Accordingly, pursuant to the requirements of the Act, please be advised that: (1) the general
    authority for the collection of this information is 35 U.S.C. 2(b)(2); (2) furnishing of the information
    solicited is voluntary; and (3) the principal purpose for which the information is used by the U.S. Patent
    and Trademark Office is to process and/or examine your submission related to a patent application or patent.</p>
  </div>
</body>
</html>
  `;
}

export function generateCoverSheetPDF(data: CoverSheetData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 15;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PTO/SB/16', pageWidth - margin, y, { align: 'right' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Doc Code: PROVAPP', pageWidth - margin, y, { align: 'right' });
  y += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PROVISIONAL APPLICATION FOR PATENT', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(11);
  doc.text('COVER SHEET', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const subtitle = 'This is a request for filing a PROVISIONAL APPLICATION FOR PATENT under 37 CFR 1.53(c)';
  doc.text(subtitle, pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INVENTION TITLE', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const titleLines = doc.splitTextToSize(data.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 5 + 3;
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INVENTOR(S)', margin, y);
  y += 6;

  doc.setFontSize(9);
  const colWidths = [10, 55, 60, 40];
  const headers = ['#', 'Full Name', 'Residence', 'Citizenship'];

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  let xPos = margin + 2;
  headers.forEach((header, i) => {
    doc.text(header, xPos, y);
    xPos += colWidths[i];
  });
  y += 5;

  doc.setFont('helvetica', 'normal');
  data.inventors.forEach((inv, idx) => {
    xPos = margin + 2;
    doc.text(String(idx + 1), xPos, y);
    xPos += colWidths[0];
    doc.text(inv.fullName.substring(0, 30), xPos, y);
    xPos += colWidths[1];
    const residence = `${inv.residence.city}, ${inv.residence.state}`;
    doc.text(residence.substring(0, 35), xPos, y);
    xPos += colWidths[2];
    doc.text(inv.citizenship, xPos, y);
    y += 5;
  });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CORRESPONDENCE ADDRESS', margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  if (data.correspondenceAddress.name) {
    doc.text(`Name: ${data.correspondenceAddress.name}`, margin, y);
    y += 4;
  }
  doc.text(`Address: ${data.correspondenceAddress.street}`, margin, y);
  y += 4;
  doc.text(`City/State/Zip: ${data.correspondenceAddress.city}, ${data.correspondenceAddress.state} ${data.correspondenceAddress.zipCode}`, margin, y);
  y += 4;
  doc.text(`Country: ${data.correspondenceAddress.country}`, margin, y);
  y += 4;
  if (data.correspondenceAddress.phone) {
    doc.text(`Phone: ${data.correspondenceAddress.phone}`, margin, y);
    y += 4;
  }
  if (data.correspondenceAddress.email) {
    doc.text(`Email: ${data.correspondenceAddress.email}`, margin, y);
    y += 4;
  }
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ENTITY STATUS', margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const entityOptions = [
    { value: 'regular', label: 'Regular Entity' },
    { value: 'small_entity', label: 'Small Entity (37 CFR 1.27)' },
    { value: 'micro_entity', label: 'Micro Entity (37 CFR 1.29)' }
  ];

  entityOptions.forEach(opt => {
    const checked = data.entityStatus === opt.value;
    doc.rect(margin, y - 3, 3, 3);
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.text('X', margin + 0.5, y - 0.5);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(opt.label, margin + 6, y);
    y += 5;
  });
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNATURE', margin, y);
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  doc.line(margin, y, margin + 80, y);
  y += 4;
  doc.text('Signature', margin, y);
  y += 8;

  doc.text('Name (Printed): ________________________________', margin, y);
  y += 6;
  const dateStr = data.filingDate ? data.filingDate.toLocaleDateString() : '________________';
  doc.text(`Date: ${dateStr}`, margin, y);

  return doc;
}

export function downloadCoverSheet(data: CoverSheetData, format: 'pdf' | 'html' = 'pdf'): void {
  if (format === 'html') {
    const html = generateCoverSheetHTML(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SB16_Cover_Sheet_${data.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const pdf = generateCoverSheetPDF(data);
    pdf.save(`SB16_Cover_Sheet_${data.title.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  }
}

export function validateCoverSheetData(data: Partial<CoverSheetData>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('Invention title is required');
  }

  if (!data.inventors || data.inventors.length === 0) {
    errors.push('At least one inventor is required');
  } else {
    data.inventors.forEach((inv, idx) => {
      if (!inv.fullName || inv.fullName.trim().length === 0) {
        errors.push(`Inventor ${idx + 1}: Full name is required`);
      }
      if (!inv.residence?.city || !inv.residence?.country) {
        errors.push(`Inventor ${idx + 1}: Residence city and country are required`);
      }
      if (!inv.citizenship) {
        errors.push(`Inventor ${idx + 1}: Citizenship is required`);
      }
    });
  }

  if (!data.correspondenceAddress) {
    errors.push('Correspondence address is required');
  } else {
    if (!data.correspondenceAddress.street) {
      errors.push('Correspondence address: Street is required');
    }
    if (!data.correspondenceAddress.city) {
      errors.push('Correspondence address: City is required');
    }
    if (!data.correspondenceAddress.zipCode) {
      errors.push('Correspondence address: Zip code is required');
    }
    if (!data.correspondenceAddress.country) {
      errors.push('Correspondence address: Country is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function createDefaultInventor(): Inventor {
  return {
    id: crypto.randomUUID(),
    fullName: '',
    residence: {
      city: '',
      state: '',
      country: 'US'
    },
    citizenship: 'US Citizen',
    mailingAddress: undefined
  };
}

export function createDefaultCorrespondenceAddress(): CorrespondenceAddress {
  return {
    name: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
    email: ''
  };
}
