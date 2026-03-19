import { useState } from 'react';
import {
  ArrowLeft, ArrowRight, UserPlus, FileCheck, Clock, AlertTriangle,
  CheckCircle2, XCircle, Upload, Send, Eye, ChevronRight,
  Building2, Users, MapPin, Radio, FileSignature,
  Loader2, Camera, Sparkles,
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { View } from './Layout';
import {
  ClientProfile, ProfileStatus, createBlankProfile,
  PROFILE_STATUS_LABELS, ADVERTISER_TYPE_LABELS, PAYMENT_TERMS_LABELS,
  SCRIPPS_STATIONS, AdvertiserType, PaymentTerms,
} from '../types';
import { SAMPLE_PROFILES } from '../data/syntheticProfiles';

interface ClientIntakeProps {
  onNavigate: (view: View) => void;
}

type IntakeView = 'dashboard' | 'wizard' | 'detail';

const STATUS_COLORS: Record<ProfileStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-surface-100', text: 'text-surface-600', border: 'border-surface-300' },
  submitted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  ai_validated: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  pushed_to_wideorbit: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-400' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
};

const SOURCE_LABELS: Record<string, string> = {
  salesperson_mobile: 'Mobile', client_self_service: 'Client Link', photo_ocr: 'Photo OCR', manual_entry: 'Manual',
};

export function ClientIntake({ onNavigate }: ClientIntakeProps) {
  const [intakeView, setIntakeView] = useState<IntakeView>('dashboard');
  const [profiles] = useState<ClientProfile[]>(SAMPLE_PROFILES);
  const [selectedProfile, setSelectedProfile] = useState<ClientProfile | null>(null);
  const [wizardProfile, setWizardProfile] = useState<ClientProfile>(createBlankProfile());
  const [wizardStep, setWizardStep] = useState(0);

  if (intakeView === 'wizard') {
    return (
      <ProfileWizard
        profile={wizardProfile}
        step={wizardStep}
        onStepChange={setWizardStep}
        onChange={setWizardProfile}
        onBack={() => { setIntakeView('dashboard'); setWizardStep(0); }}
      />
    );
  }

  if (intakeView === 'detail' && selectedProfile) {
    return (
      <ProfileDetail
        profile={selectedProfile}
        onBack={() => setIntakeView('dashboard')}
      />
    );
  }

  // Dashboard
  const byStatus = (s: ProfileStatus) => profiles.filter(p => p.status === s);
  const today = profiles.filter(p => {
    const created = new Date(p.createdAt);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  });

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600 transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Client Profile Intake</h1>
            <p className="text-surface-500 mt-1">Digital profile setup — replaces handwritten paper forms</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setWizardProfile(createBlankProfile()); setWizardStep(0); setIntakeView('wizard'); }} className="btn-primary flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> New Profile
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <IntakeKPI label="Created Today" value={`${today.length}`} tooltip="Profiles created today. Average is ~20/day, can hit 40 at month-end." />
        <IntakeKPI label="Drafts" value={`${byStatus('draft').length}`} tooltip="Profiles still being filled in by salespeople. Auto-saved." />
        <IntakeKPI label="Awaiting Validation" value={`${byStatus('submitted').length}`} warn tooltip="Submitted profiles waiting for AI validation (duplicate check, format check, completeness)." />
        <IntakeKPI label="Ready for Approval" value={`${byStatus('ai_validated').length}`} tooltip="AI-validated profiles ready for O2C team review and approval." />
        <IntakeKPI label="WideOrbit Ready" value={`${byStatus('approved').length}`} good tooltip="Approved profiles ready to push to WideOrbit. Clean data, validated, no duplicates." />
      </div>

      {/* Savings callout */}
      <div className="card p-4 bg-emerald-50 border-emerald-200 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800">
            Digital intake saves ~20 min per profile vs. handwritten paper forms.
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            At 20 profiles/day, that's ~6.7 hours/day of manual data entry eliminated. Error rate drops from ~12% to &lt;1%.
          </p>
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="card p-5">
        <h3 className="font-semibold text-surface-900 mb-4">Profile Pipeline</h3>
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {(['draft', 'submitted', 'ai_validated', 'approved', 'pushed_to_wideorbit'] as ProfileStatus[]).map((status, i) => {
            const count = byStatus(status).length;
            const sc = STATUS_COLORS[status];
            return (
              <div key={status} className="flex items-center">
                <div className={`rounded-lg px-4 py-2 border ${sc.bg} ${sc.border} text-center min-w-[100px]`}>
                  <div className={`text-lg font-bold ${sc.text}`}>{count}</div>
                  <div className="text-xs text-surface-500">{PROFILE_STATUS_LABELS[status]}</div>
                </div>
                {i < 4 && <ChevronRight className="w-5 h-5 text-surface-300 mx-1 flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Profiles list */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Advertiser</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Source</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Station(s)</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Created By</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Score</th>
                <th className="text-left px-4 py-3 font-medium text-surface-500">Issues</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {profiles.map(p => {
                const sc = STATUS_COLORS[p.status];
                return (
                  <tr key={p.id} className="hover:bg-surface-50 cursor-pointer" onClick={() => { setSelectedProfile(p); setIntakeView('detail'); }}>
                    <td className="px-4 py-3 font-medium text-surface-900">
                      {p.advertiserName || <span className="text-surface-400 italic">Untitled</span>}
                      {p.duplicateWarning && <span className="ml-1 text-red-500 text-xs font-normal">DUPLICATE</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        {PROFILE_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-500 text-xs">{SOURCE_LABELS[p.source]}</td>
                    <td className="px-4 py-3 text-surface-500 text-xs">{p.stations.map(s => s.split(' ')[0]).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-surface-500 text-xs">{p.createdBy}</td>
                    <td className="px-4 py-3">
                      {p.validationScore != null ? (
                        <span className={`text-xs font-bold ${p.validationScore >= 90 ? 'text-emerald-600' : p.validationScore >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                          {p.validationScore}/100
                        </span>
                      ) : <span className="text-surface-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.validationIssues && p.validationIssues.length > 0 && (
                        <span className="text-amber-500 text-xs">{p.validationIssues.length} issue{p.validationIssues.length > 1 ? 's' : ''}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><Eye className="w-4 h-4 text-surface-400" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Detail View
// ---------------------------------------------------------------------------
function ProfileDetail({ profile: p, onBack }: { profile: ClientProfile; onBack: () => void }) {
  const sc = STATUS_COLORS[p.status];
  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600 transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Intake
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-surface-900">{p.advertiserName}</h1>
          <span className={`text-sm font-medium px-3 py-1 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
            {PROFILE_STATUS_LABELS[p.status]}
          </span>
        </div>
      </div>

      {/* Duplicate warning */}
      {p.duplicateWarning && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Duplicate Detected</p>
            <p className="text-sm text-red-700 mt-0.5">{p.duplicateWarning}</p>
          </div>
        </div>
      )}

      {/* Validation issues */}
      {p.validationIssues && p.validationIssues.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Validation Issues ({p.validationIssues.length})
          </p>
          <ul className="space-y-1">
            {p.validationIssues.map((issue, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-400 mt-1">--</span> {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Profile data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DetailSection title="Advertiser" icon={Building2}>
          <DetailRow label="Legal Name" value={p.advertiserName} />
          <DetailRow label="DBA" value={p.dbaName} />
          <DetailRow label="Type" value={ADVERTISER_TYPE_LABELS[p.advertiserType]} />
          <DetailRow label="Industry" value={p.industryCategory} />
          <DetailRow label="Tax ID" value={p.taxId} />
          <DetailRow label="Website" value={p.website} />
        </DetailSection>

        <DetailSection title="Contacts" icon={Users}>
          <DetailRow label="Primary" value={`${p.contactName}${p.contactTitle ? ` (${p.contactTitle})` : ''}`} />
          <DetailRow label="Email" value={p.contactEmail} />
          <DetailRow label="Phone" value={p.contactPhone} />
          <DetailRow label="AP Contact" value={p.apContactName} />
          <DetailRow label="AP Email" value={p.apContactEmail} />
          <DetailRow label="AP Phone" value={p.apContactPhone} />
        </DetailSection>

        <DetailSection title="Billing Address" icon={MapPin}>
          <DetailRow label="Address" value={[p.billingAddress1, p.billingAddress2].filter(Boolean).join(', ')} />
          <DetailRow label="City/State/Zip" value={`${p.billingCity}, ${p.billingState} ${p.billingZip}`} />
          <DetailRow label="Payment Terms" value={PAYMENT_TERMS_LABELS[p.paymentTerms]} />
          <DetailRow label="Credit Limit" value={p.creditLimit ? `$${p.creditLimit.toLocaleString()}` : '—'} />
          <DetailRow label="PO Required" value={p.poRequired ? 'Yes' : 'No'} />
        </DetailSection>

        <DetailSection title="Broadcast" icon={Radio}>
          <DetailRow label="Stations" value={p.stations.join(', ') || '—'} />
          <DetailRow label="Dayparts" value={p.defaultDayparts.join(', ') || '—'} />
          <DetailRow label="Contract" value={p.contractStartDate ? `${p.contractStartDate} to ${p.contractEndDate}` : '—'} />
          <DetailRow label="Special Instructions" value={p.specialInstructions} />
        </DetailSection>
      </div>

      {/* Metadata footer */}
      <div className="card p-4 bg-surface-50 text-xs text-surface-500 flex flex-wrap gap-4">
        <span>Source: {SOURCE_LABELS[p.source]}</span>
        <span>Created by: {p.createdBy}</span>
        <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
        {p.validationScore != null && <span>Validation Score: {p.validationScore}/100</span>}
      </div>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }: { title: string; icon: typeof Building2; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand-600" /> {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-surface-500">{label}</span>
      <span className="text-surface-900 font-medium text-right max-w-[60%]">{value || <span className="text-surface-300">—</span>}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Wizard (5 steps, mobile-first)
// ---------------------------------------------------------------------------
const WIZARD_STEPS = [
  { label: 'Advertiser', icon: Building2 },
  { label: 'Contacts', icon: Users },
  { label: 'Address & Terms', icon: MapPin },
  { label: 'Broadcast', icon: Radio },
  { label: 'Review & Submit', icon: FileSignature },
];

function ProfileWizard({ profile, step, onStepChange, onChange, onBack }: {
  profile: ClientProfile; step: number; onStepChange: (s: number) => void; onChange: (p: ClientProfile) => void; onBack: () => void;
}) {
  const update = (fields: Partial<ClientProfile>) => onChange({ ...profile, ...fields, updatedAt: new Date().toISOString() });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-surface-500 hover:text-brand-600 transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Intake
        </button>
        <h1 className="text-2xl font-bold text-surface-900">New Client Profile</h1>
        <p className="text-surface-500 text-sm mt-1">Fill in client details — all fields auto-save</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {WIZARD_STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <button
              onClick={() => onStepChange(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full justify-center ${
                i === step ? 'bg-brand-50 text-brand-700 border border-brand-300' :
                i < step ? 'bg-emerald-50 text-emerald-700' :
                'bg-surface-50 text-surface-400'
              }`}
            >
              {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card p-6">
        {step === 0 && <AdvertiserStep profile={profile} update={update} />}
        {step === 1 && <ContactsStep profile={profile} update={update} />}
        {step === 2 && <AddressTermsStep profile={profile} update={update} />}
        {step === 3 && <BroadcastStep profile={profile} update={update} />}
        {step === 4 && <ReviewStep profile={profile} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => step > 0 ? onStepChange(step - 1) : onBack()}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Previous'}
        </button>
        {step < 4 ? (
          <button onClick={() => onStepChange(step + 1)} className="btn-primary flex items-center gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Send className="w-4 h-4" /> Submit for Validation
          </button>
        )}
      </div>

      {/* OCR Upload hint */}
      {step === 0 && (
        <div className="card p-4 border-dashed border-2 border-surface-300 bg-surface-50 text-center">
          <Camera className="w-8 h-8 text-surface-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-surface-600">Have a paper form?</p>
          <p className="text-xs text-surface-400 mt-1">Upload a photo and Claude AI will read it and pre-fill the fields</p>
          <button className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 mx-auto">
            <Upload className="w-4 h-4" /> Upload Photo (Coming Soon)
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wizard Steps
// ---------------------------------------------------------------------------
function FieldInput({ label, value, onChange, placeholder, required, type = 'text', tooltip }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string; tooltip?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-surface-600 mb-1">
        {label}{required && <span className="text-red-400">*</span>}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input w-full"
      />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, tooltip }: {
  label: string; value: string; onChange: (v: string) => void; options: Record<string, string>; tooltip?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-surface-600 mb-1">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input w-full">
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

function AdvertiserStep({ profile: p, update }: { profile: ClientProfile; update: (f: Partial<ClientProfile>) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-surface-900">Advertiser Information</h3>
      <FieldInput label="Legal Business Name" value={p.advertiserName} onChange={v => update({ advertiserName: v })} placeholder="e.g., Riverside Toyota" required tooltip="The official legal name of the business as it appears on tax documents." />
      <FieldInput label="DBA / Trade Name" value={p.dbaName} onChange={v => update({ dbaName: v })} placeholder="e.g., Riverside Auto Group" tooltip="'Doing Business As' name, if different from legal name. Used for on-air credits." />
      <FieldSelect label="Advertiser Type" value={p.advertiserType} onChange={v => update({ advertiserType: v as AdvertiserType })} options={ADVERTISER_TYPE_LABELS} tooltip="Direct = buys directly. Agency Rep = has a media buying agency. National = national brand. Local = local business." />
      <FieldInput label="Industry Category" value={p.industryCategory} onChange={v => update({ industryCategory: v })} placeholder="e.g., Automotive, Healthcare, Legal" />
      <FieldInput label="Tax ID (EIN)" value={p.taxId} onChange={v => update({ taxId: v })} placeholder="XX-XXXXXXX" required tooltip="Federal Employer Identification Number. Critical for deduplication — this is the primary key for matching existing clients." />
      <FieldInput label="Website" value={p.website} onChange={v => update({ website: v })} placeholder="e.g., example.com" />
    </div>
  );
}

function ContactsStep({ profile: p, update }: { profile: ClientProfile; update: (f: Partial<ClientProfile>) => void }) {
  const showAgency = p.advertiserType === 'agency_rep' || p.advertiserType === 'national';
  return (
    <div className="space-y-5">
      {showAgency && (
        <div className="space-y-3">
          <h3 className="font-semibold text-surface-900">Agency Information</h3>
          <FieldInput label="Agency Name" value={p.agencyName} onChange={v => update({ agencyName: v })} required />
          <FieldInput label="Agency Contact" value={p.agencyContactName} onChange={v => update({ agencyContactName: v })} />
          <FieldInput label="Agency Email" value={p.agencyContactEmail} onChange={v => update({ agencyContactEmail: v })} type="email" />
          <FieldInput label="Agency Phone" value={p.agencyContactPhone} onChange={v => update({ agencyContactPhone: v })} type="tel" />
        </div>
      )}
      <div className="space-y-3">
        <h3 className="font-semibold text-surface-900">Primary Contact</h3>
        <FieldInput label="Full Name" value={p.contactName} onChange={v => update({ contactName: v })} required />
        <FieldInput label="Title" value={p.contactTitle} onChange={v => update({ contactTitle: v })} placeholder="e.g., Marketing Director" />
        <FieldInput label="Email" value={p.contactEmail} onChange={v => update({ contactEmail: v })} type="email" required />
        <FieldInput label="Phone" value={p.contactPhone} onChange={v => update({ contactPhone: v })} type="tel" />
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold text-surface-900 flex items-center gap-1">
          Accounts Payable Contact
          <Tooltip text="The AP contact receives invoices and payment requests via WO Payments Suite. Getting this right avoids payment delays." />
        </h3>
        <FieldInput label="AP Contact Name" value={p.apContactName} onChange={v => update({ apContactName: v })} required />
        <FieldInput label="AP Email" value={p.apContactEmail} onChange={v => update({ apContactEmail: v })} type="email" required tooltip="This email is used for dunning notices and payment portal invitations in WO Payments Suite." />
        <FieldInput label="AP Phone" value={p.apContactPhone} onChange={v => update({ apContactPhone: v })} type="tel" />
      </div>
    </div>
  );
}

function AddressTermsStep({ profile: p, update }: { profile: ClientProfile; update: (f: Partial<ClientProfile>) => void }) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="font-semibold text-surface-900">Billing Address</h3>
        <FieldInput label="Address Line 1" value={p.billingAddress1} onChange={v => update({ billingAddress1: v })} required />
        <FieldInput label="Address Line 2" value={p.billingAddress2} onChange={v => update({ billingAddress2: v })} placeholder="Suite, Floor, etc." />
        <div className="grid grid-cols-3 gap-3">
          <FieldInput label="City" value={p.billingCity} onChange={v => update({ billingCity: v })} required />
          <FieldInput label="State" value={p.billingState} onChange={v => update({ billingState: v })} required placeholder="e.g., TN" />
          <FieldInput label="ZIP" value={p.billingZip} onChange={v => update({ billingZip: v })} required placeholder="e.g., 37216" />
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold text-surface-900">Credit & Payment Terms</h3>
        <FieldSelect label="Payment Terms" value={p.paymentTerms} onChange={v => update({ paymentTerms: v as PaymentTerms })} options={PAYMENT_TERMS_LABELS} tooltip="Net 30 is standard. This flows to WO Payments Suite for automated dunning and payment requests." />
        <FieldInput label="Credit Limit" value={p.creditLimit ? String(p.creditLimit) : ''} onChange={v => update({ creditLimit: Number(v) || 0 })} type="number" placeholder="e.g., 50000" tooltip="Maximum outstanding balance allowed. Leave blank or 0 for no limit." />
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-surface-700">
            <input type="checkbox" checked={p.creditAppRequired} onChange={e => update({ creditAppRequired: e.target.checked })} className="rounded border-surface-300" />
            Credit Application Required
          </label>
          <label className="flex items-center gap-2 text-sm text-surface-700">
            <input type="checkbox" checked={p.poRequired} onChange={e => update({ poRequired: e.target.checked })} className="rounded border-surface-300" />
            Purchase Order Required
          </label>
        </div>
      </div>
    </div>
  );
}

function BroadcastStep({ profile: p, update }: { profile: ClientProfile; update: (f: Partial<ClientProfile>) => void }) {
  const toggleStation = (s: string) => {
    const next = p.stations.includes(s) ? p.stations.filter(x => x !== s) : [...p.stations, s];
    update({ stations: next });
  };
  const dayparts = ['M-F Early Morning', 'M-F 6-10a', 'M-F 10a-3p', 'M-F Primetime', 'Late Night', 'Weekend', 'Sports'];
  const toggleDaypart = (d: string) => {
    const next = p.defaultDayparts.includes(d) ? p.defaultDayparts.filter(x => x !== d) : [...p.defaultDayparts, d];
    update({ defaultDayparts: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-surface-900 mb-3">Scripps Stations</h3>
        <div className="grid grid-cols-2 gap-2">
          {SCRIPPS_STATIONS.map(s => (
            <label key={s} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
              p.stations.includes(s) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-600 hover:bg-surface-50'
            }`}>
              <input type="checkbox" checked={p.stations.includes(s)} onChange={() => toggleStation(s)} className="rounded border-surface-300 text-brand-600" />
              {s}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-surface-900 mb-3">Preferred Dayparts</h3>
        <div className="flex flex-wrap gap-2">
          {dayparts.map(d => (
            <button key={d} onClick={() => toggleDaypart(d)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              p.defaultDayparts.includes(d) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-500 hover:bg-surface-50'
            }`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Contract Start" value={p.contractStartDate} onChange={v => update({ contractStartDate: v })} type="date" />
        <FieldInput label="Contract End" value={p.contractEndDate} onChange={v => update({ contractEndDate: v })} type="date" />
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-600 mb-1">Special Instructions</label>
        <textarea
          value={p.specialInstructions}
          onChange={e => update({ specialInstructions: e.target.value })}
          className="input w-full h-20 resize-none"
          placeholder="Billing preferences, makegood policies, etc."
        />
      </div>
    </div>
  );
}

function ReviewStep({ profile: p }: { profile: ClientProfile }) {
  const fields = [
    ['Advertiser', p.advertiserName], ['Type', ADVERTISER_TYPE_LABELS[p.advertiserType]], ['Tax ID', p.taxId],
    ['Contact', p.contactName], ['Email', p.contactEmail], ['AP Contact', p.apContactName],
    ['Address', `${p.billingAddress1}, ${p.billingCity} ${p.billingState} ${p.billingZip}`],
    ['Terms', PAYMENT_TERMS_LABELS[p.paymentTerms]], ['Stations', p.stations.join(', ') || '—'],
  ];
  const missing = [];
  if (!p.advertiserName) missing.push('Advertiser name');
  if (!p.taxId) missing.push('Tax ID');
  if (!p.contactEmail) missing.push('Contact email');
  if (!p.apContactName) missing.push('AP contact');
  if (!p.billingAddress1) missing.push('Billing address');
  if (p.stations.length === 0) missing.push('Station selection');

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-surface-900">Review Profile</h3>
      {missing.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Missing Fields</p>
          <p className="text-xs text-amber-700 mt-1">{missing.join(', ')}</p>
        </div>
      )}
      <div className="bg-surface-50 rounded-lg divide-y divide-surface-200">
        {fields.map(([label, value], i) => (
          <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-surface-500">{label}</span>
            <span className="text-surface-900 font-medium">{value || <span className="text-red-400">Missing</span>}</span>
          </div>
        ))}
      </div>
      <div className="p-3 bg-brand-50 rounded-lg border border-brand-200 text-sm text-brand-800">
        <p className="font-medium flex items-center gap-2"><Sparkles className="w-4 h-4" /> What happens next:</p>
        <p className="text-xs mt-1">Claude AI will validate this profile — checking for duplicates, format errors, and missing data. The O2C team reviews and approves before pushing to WideOrbit.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intake KPI
// ---------------------------------------------------------------------------
function IntakeKPI({ label, value, tooltip, warn, good }: { label: string; value: string; tooltip?: string; warn?: boolean; good?: boolean }) {
  return (
    <div className={`rounded-lg p-3 border ${
      good ? 'bg-emerald-50 border-emerald-200' :
      warn ? 'bg-amber-50 border-amber-200' :
      'bg-surface-50 border-surface-200'
    }`}>
      <div className="text-xs text-surface-500 flex items-center gap-1">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      <div className={`text-lg font-bold ${
        good ? 'text-emerald-700' : warn ? 'text-amber-700' : 'text-surface-900'
      }`}>{value}</div>
    </div>
  );
}
