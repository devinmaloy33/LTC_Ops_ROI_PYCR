'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, ArrowLeft, Ban, Bot, Building2, CalendarCheck, Check,
  CheckCircle2, Clipboard, Clock3, Download, FileText, Headphones, Loader2,
  ExternalLink, LogOut, Mail, Phone, RefreshCw, Save, Search, ShieldCheck, Sparkles, Users, XCircle,
} from 'lucide-react';
import { CRITICAL_INPUT_LABELS } from '@/lib/readiness';
import { OUTREACH_PERSONAS, OutreachCampaign, campaignToPlainText } from '@/lib/outreach';

type FacilitySummary = {
  ccn: string; facilityName: string; city: string; state: string; zip: string; chainName: string | null;
  overallRating: number | null; staffingRating: number | null; healthInspectionRating: number | null; qualityMeasureRating: number | null;
  sessionCount: number; downloadCount: number; isComplete: boolean; missingFields: string[];
  lastActivityAt: number; lastDownloadedAt: number | null;
  voiceCallCount: number; pendingAppointmentCount: number; confirmedAppointmentCount: number; latestCallStatus: string | null;
};
type FacilityListResponse = {
  summary: { facilities: number; complete: number; needsCompletion: number; downloaded: number; voiceCalls: number; appointmentsPending: number; appointmentsConfirmed: number };
  states: string[]; facilities: FacilitySummary[]; error?: string;
};
type OutreachFact = { id: string; label: string; value: string; source: string };
type SavedCampaign = {
  id: string; persona: string; contactName: string | null; contactTitle: string | null; createdAt: number;
  selectedFacts: OutreachFact[]; campaign: OutreachCampaign; model: string;
};
type VoiceCall = {
  id: string; ccn: string; campaignId: string | null; campaignTouchDay: number | null; phoneNumber: string; persona: string;
  callBrief: { opener?: string; voicemail?: string; calendlyUrl?: string; appointmentLength?: string; selectedFacts?: OutreachFact[]; discoveryQuestions?: string[]; objectionResponses?: Array<{ objection: string; response: string }> };
  knownContactName: string | null; knownContactTitle: string | null; knownContactEmail: string | null; knownContactExtension: string | null;
  conversationId: string | null; providerCallSid: string | null; providerConversationUrl: string | null; status: string;
  transcript: Array<{ role: string; text: string; atSeconds: number | null }>; summary: string | null;
  callSuccessful: boolean | null; durationSeconds: number | null; costCredits: number | null;
  capturedContactName: string | null; capturedContactTitle: string | null; capturedContactEmail: string | null; capturedContactExtension: string | null;
  connectionOutcome: string | null; phoneTreePath: string | null; voicemailLeft: boolean;
  dataCollection: Record<string, unknown>; evaluations: Record<string, unknown>; agentVersionId: string | null;
  appointmentStatus: 'none'|'pending'|'confirmed'|'declined'; appointmentDetails: string | null;
  preferredDay: string | null; preferredTimeWindow: string | null; preferredTimezone: string | null;
  followUpPermission: boolean | null; autoExtractedAt: number | null;
  outcomeNotes: string | null; optedOut: boolean; failureReason: string | null;
  complianceAttestedAt: number; startedAt: number | null; endedAt: number | null; createdAt: number; updatedAt: number;
};
type FacilityDetail = {
  facility: Record<string, unknown> & { ccn: string; facilityName: string; city?: string; state?: string; zip?: string };
  engagements: Array<{ id: string; startedAt: number; lastActivityAt: number; currentStep: number; isComplete: boolean; missingFields: string[]; downloadCount: number; lastDownloadedAt: number | null }>;
  events: Array<{ id: string; eventType: string; occurredAt: number; metadata: Record<string, unknown> }>;
  campaigns: SavedCampaign[];
  voiceCalls: VoiceCall[];
  doNotCallNumbers: Array<{ phoneNumber: string; reason: string; createdAt: number }>;
  availableFacts: OutreachFact[];
  error?: string;
};

const DEFAULT_OPT_OUT = "If this isn't relevant, reply no thanks and I won't follow up.";

export default function AdminDashboard({ userName, userEmail, signOutPath }: { userName: string; userEmail: string; signOutPath: string }) {
  const [data, setData] = useState<FacilityListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [downloaded, setDownloaded] = useState('all');
  const [state, setState] = useState('all');
  const [selectedCcn, setSelectedCcn] = useState('');
  const [detail, setDetail] = useState<FacilityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadFacilities = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ status, downloaded, state });
      if (debouncedQuery) params.set('q', debouncedQuery);
      const response = await fetch(`/api/admin/facilities?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json() as FacilityListResponse;
      if (!response.ok) throw new Error(payload.error || 'Facility activity could not be loaded.');
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Facility activity could not be loaded.');
    } finally { setLoading(false); }
  }, [debouncedQuery, status, downloaded, state]);

  useEffect(() => { void loadFacilities(); }, [loadFacilities]);

  const loadDetail = useCallback(async (ccn: string) => {
    setSelectedCcn(ccn); setDetailLoading(true); setDetail(null); setError('');
    try {
      const response = await fetch(`/api/admin/facilities/${ccn}`, { cache: 'no-store' });
      const payload = await response.json() as FacilityDetail;
      if (!response.ok) throw new Error(payload.error || 'Facility details could not be loaded.');
      setDetail(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Facility details could not be loaded.');
    } finally { setDetailLoading(false); }
  }, []);

  const summary = data?.summary || { facilities: 0, complete: 0, needsCompletion: 0, downloaded: 0, voiceCalls: 0, appointmentsPending: 0, appointmentsConfirmed: 0 };

  return (
    <main className="min-h-screen bg-[#f3f4f3] text-paycor-charcoal">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <img src="/paycor-empowering-leaders.png" alt="Paycor Empowering Leaders" className="h-11 w-auto object-contain" />
            <div className="border-l border-slate-200 pl-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-paycor-orange">Private workspace</p>
              <h1 className="text-xl font-black">LTC Opportunity Dashboard</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="hidden text-paycor-medium-grey md:inline">Signed in as {userName || userEmail}</span>
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-bold"><ArrowLeft className="h-3.5 w-3.5" /> Calculator</Link>
            <a href={signOutPath} className="inline-flex items-center gap-2 rounded-xl bg-paycor-charcoal px-3 py-2 font-bold text-white"><LogOut className="h-3.5 w-3.5" /> Sign out</a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-6 px-5 py-7">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <SummaryCard icon={<Building2 />} label="Facilities looked up" value={summary.facilities} />
          <SummaryCard icon={<Clock3 />} label="Needs completion" value={summary.needsCompletion} tone="amber" />
          <SummaryCard icon={<CheckCircle2 />} label="Completed" value={summary.complete} tone="green" />
          <SummaryCard icon={<Download />} label="Downloaded" value={summary.downloaded} tone="blue" />
          <SummaryCard icon={<Headphones />} label="Outbound calls" value={summary.voiceCalls} />
          <SummaryCard icon={<CalendarCheck />} label="Appointments pending" value={summary.appointmentsPending} tone="amber" />
          <SummaryCard icon={<CalendarCheck />} label="Appointments confirmed" value={summary.appointmentsConfirmed} tone="green" />
        </section>

        {error && <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-black">Facility activity</h2>
              <p className="mt-1 text-xs text-paycor-medium-grey">Anonymous engagement, readiness, and successful report downloads.</p>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:max-w-4xl xl:grid-cols-5">
              <label className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search facility, CCN, chain or city" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-paycor-orange" />
              </label>
              <FilterSelect value={status} onChange={setStatus} options={[['all','All statuses'],['needs_completion','Needs completion'],['complete','Completed']]} />
              <FilterSelect value={downloaded} onChange={setDownloaded} options={[['all','All downloads'],['yes','Downloaded'],['no','Not downloaded']]} />
              <div className="flex gap-2">
                <FilterSelect value={state} onChange={setState} options={[['all','All states'],...(data?.states || []).map((item) => [item,item] as [string,string])]} />
                <button type="button" onClick={() => void loadFacilities()} className="rounded-xl border border-slate-200 p-2.5 text-paycor-medium-grey" aria-label="Refresh facility activity"><RefreshCw className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-paycor-grey">
                <tr><th className="px-5 py-3">Facility</th><th className="px-4 py-3">CMS</th><th className="px-4 py-3">Progress</th><th className="px-4 py-3">Missing</th><th className="px-4 py-3">Lookups</th><th className="px-4 py-3">Downloads</th><th className="px-4 py-3">Calls</th><th className="px-5 py-3">Last activity</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} className="px-5 py-12 text-center text-paycor-medium-grey"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading activity…</td></tr>}
                {!loading && data?.facilities.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-paycor-medium-grey">No tracked facilities match these filters.</td></tr>}
                {!loading && data?.facilities.map((facility) => (
                  <tr key={facility.ccn} onClick={() => void loadDetail(facility.ccn)} className={`cursor-pointer border-t border-slate-100 transition hover:bg-orange-50/40 ${selectedCcn === facility.ccn ? 'bg-orange-50/60' : ''}`}>
                    <td className="px-5 py-4"><p className="font-extrabold">{facility.facilityName}</p><p className="mt-1 text-[10px] text-paycor-grey">CCN {facility.ccn} · {[facility.city, facility.state].filter(Boolean).join(', ') || 'Location unavailable'}</p></td>
                    <td className="px-4 py-4"><span className="font-extrabold text-paycor-orange">{facility.overallRating ?? '—'} ★</span><p className="mt-1 text-[10px] text-paycor-grey">Overall</p></td>
                    <td className="px-4 py-4"><StatusBadge complete={facility.isComplete} /></td>
                    <td className="max-w-[220px] px-4 py-4 text-[10px] text-paycor-medium-grey">{facility.missingFields.length ? facility.missingFields.map((field) => CRITICAL_INPUT_LABELS[field] || field).join(', ') : 'None'}</td>
                    <td className="px-4 py-4 font-bold">{facility.sessionCount}</td>
                    <td className="px-4 py-4"><span className="font-bold">{facility.downloadCount}</span>{facility.lastDownloadedAt ? <p className="mt-1 text-[10px] text-paycor-grey">{formatDate(facility.lastDownloadedAt)}</p> : null}</td>
                    <td className="px-4 py-4"><span className="font-bold">{facility.voiceCallCount}</span>{facility.pendingAppointmentCount > 0 ? <p className="mt-1 text-[10px] font-bold text-amber-700">{facility.pendingAppointmentCount} pending</p> : facility.latestCallStatus ? <p className="mt-1 text-[10px] text-paycor-grey">{callStatusLabel(facility.latestCallStatus)}</p> : null}</td>
                    <td className="px-5 py-4 text-paycor-medium-grey">{formatDate(facility.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedCcn && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
            {detailLoading && <div className="py-12 text-center text-sm text-paycor-medium-grey"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />Loading facility workspace…</div>}
            {detail && <FacilityWorkspace detail={detail} onCampaignSaved={async () => { await loadDetail(selectedCcn); await loadFacilities(); }} />}
          </section>
        )}
      </div>
    </main>
  );
}

function FacilityWorkspace({ detail, onCampaignSaved }: { detail: FacilityDetail; onCampaignSaved: () => Promise<void> }) {
  const facility = detail.facility;
  const latest = detail.engagements[0];
  const [persona, setPersona] = useState<(typeof OUTREACH_PERSONAS)[number]>('COO / Administrator');
  const [customRole, setCustomRole] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [optOutLine, setOptOutLine] = useState(DEFAULT_OPT_OUT);
  const [selectedFacts, setSelectedFacts] = useState<string[]>(() => detail.availableFacts.slice(0, 2).map((fact) => fact.id));
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [activeCampaign, setActiveCampaign] = useState<SavedCampaign | null>(detail.campaigns[0] || null);
  const [copied, setCopied] = useState('');

  const toggleFact = (id: string) => setSelectedFacts((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 6 ? [...current, id] : current);
  const generate = async () => {
    setGenerating(true); setGenerationError('');
    try {
      const response = await fetch('/api/admin/outreach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ccn: facility.ccn, persona, customRole, contactName, contactTitle, adminNotes, optOutLine, factIds: selectedFacts }),
      });
      const payload = await response.json() as { campaign?: SavedCampaign; error?: string };
      if (!response.ok || !payload.campaign) throw new Error(payload.error || 'Campaign could not be generated.');
      setActiveCampaign(payload.campaign); await onCampaignSaved();
    } catch (error) { setGenerationError(error instanceof Error ? error.message : 'Campaign could not be generated.'); }
    finally { setGenerating(false); }
  };
  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(''), 1800);
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-paycor-orange">Facility workspace</p><h2 className="mt-2 text-2xl font-black">{String(facility.facilityName)}</h2><p className="mt-1 text-xs text-paycor-medium-grey">CCN {String(facility.ccn)} · {[facility.city, facility.state, facility.zip].filter(Boolean).join(', ')}</p></div>
        <div className="flex flex-wrap gap-2"><StatusBadge complete={Boolean(latest?.isComplete)} /><span className="rounded-full bg-sky-50 px-3 py-1.5 text-[10px] font-extrabold text-sky-700">{detail.engagements.reduce((sum, item) => sum + item.downloadCount, 0)} downloads</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-extrabold text-paycor-medium-grey">{detail.engagements.length} anonymous sessions</span></div>
      </div>

      <VoiceCallingPanel detail={detail} onChanged={onCampaignSaved} />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <div className="space-y-5">
          <InfoPanel title="CMS snapshot" icon={<Building2 />}>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Overall" value={starValue(facility.overallRating)} /><Metric label="Staffing" value={starValue(facility.staffingRating)} />
              <Metric label="Health inspection" value={starValue(facility.healthInspectionRating)} /><Metric label="Quality measure" value={starValue(facility.qualityMeasureRating)} />
              <Metric label="Certified beds" value={displayValue(facility.beds)} /><Metric label="Turnover" value={facility.turnoverRate == null ? '—' : `${facility.turnoverRate}%`} />
            </div>
          </InfoPanel>
          <InfoPanel title="Current progress" icon={<Activity />}>
            {latest ? <><div className="flex items-center justify-between text-xs"><span>Latest calculator step</span><strong>Step {latest.currentStep} of 3</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-paycor-orange" style={{ width: `${Math.min(100, latest.currentStep / 3 * 100)}%` }} /></div><p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-paycor-grey">Still needs</p><p className="mt-2 text-xs leading-relaxed text-paycor-medium-grey">{latest.missingFields.length ? latest.missingFields.map((field) => CRITICAL_INPUT_LABELS[field] || field).join(', ') : 'All required inputs are validated.'}</p></> : <p className="text-xs text-paycor-medium-grey">No engagement details are available.</p>}
          </InfoPanel>
          <InfoPanel title="Recent activity" icon={<Clock3 />}>
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">{detail.events.slice(0, 12).map((event) => <div key={event.id} className="flex gap-3 text-xs"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-paycor-orange" /><div><p className="font-bold">{eventLabel(event.eventType)}</p><p className="mt-0.5 text-[10px] text-paycor-grey">{formatDate(event.occurredAt)}</p></div></div>)}</div>
          </InfoPanel>
        </div>

        <div className="rounded-3xl border border-orange-200 bg-orange-50/30 p-5 lg:p-6">
          <div className="flex items-start gap-3"><div className="rounded-2xl bg-paycor-orange p-2.5 text-white"><Sparkles className="h-5 w-5" /></div><div><h3 className="text-base font-black">Outreach cadence generator</h3><p className="mt-1 text-xs leading-relaxed text-paycor-medium-grey">Create a unique Day 1, 3, and 7 email and phone sequence using only the facts you approve.</p></div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <FieldLabel label="Persona"><select value={persona} onChange={(event) => setPersona(event.target.value as typeof persona)} className="admin-input">{OUTREACH_PERSONAS.map((item) => <option key={item}>{item}</option>)}</select></FieldLabel>
            {persona === 'Other' ? <FieldLabel label="Custom role"><input value={customRole} onChange={(event) => setCustomRole(event.target.value)} className="admin-input" /></FieldLabel> : <div />}
            <FieldLabel label="Contact name (optional)"><input value={contactName} onChange={(event) => setContactName(event.target.value)} className="admin-input" /></FieldLabel>
            <FieldLabel label="Contact title (optional)"><input value={contactTitle} onChange={(event) => setContactTitle(event.target.value)} className="admin-input" /></FieldLabel>
          </div>
          <div className="mt-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-paycor-grey">Select 1–6 facts</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{detail.availableFacts.map((fact) => <label key={fact.id} className={`cursor-pointer rounded-xl border p-3 text-xs ${selectedFacts.includes(fact.id) ? 'border-paycor-orange bg-white' : 'border-slate-200 bg-white/70'}`}><div className="flex items-start gap-2"><input type="checkbox" checked={selectedFacts.includes(fact.id)} onChange={() => toggleFact(fact.id)} className="mt-0.5 accent-[#F58220]" /><div><p className="font-extrabold">{fact.label}: {fact.value}</p><p className="mt-1 text-[9px] text-paycor-grey">{fact.source}</p></div></div></label>)}</div></div>
          <div className="mt-4 grid gap-3">
            <FieldLabel label="Administrator context (optional)"><textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} rows={3} className="admin-input resize-y" placeholder="Relevant initiative, relationship context, or verified local detail." /></FieldLabel>
            <FieldLabel label="Editable opt-out line"><input value={optOutLine} onChange={(event) => setOptOutLine(event.target.value)} className="admin-input" /></FieldLabel>
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Before sending, include accurate sender information, identify the commercial nature of the email, add a valid postal address, and honor opt-outs.</div>
          {generationError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{generationError}</div>}
          <button type="button" onClick={() => void generate()} disabled={generating || selectedFacts.length === 0 || (persona === 'Other' && !customRole.trim())} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-paycor-orange px-5 py-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">{generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{generating ? 'Creating and checking cadence…' : detail.campaigns.length ? 'Generate a new cadence' : 'Generate cadence'}</button>
        </div>
      </div>

      {activeCampaign && <CampaignView saved={activeCampaign} copied={copied} onCopy={copy} />}
      {detail.campaigns.length > 0 && <div><h3 className="text-sm font-black">Saved campaign history</h3><div className="mt-3 flex flex-wrap gap-2">{detail.campaigns.map((campaign) => <button type="button" key={campaign.id} onClick={() => setActiveCampaign(campaign)} className={`rounded-xl border px-3 py-2 text-left text-[10px] ${activeCampaign?.id === campaign.id ? 'border-paycor-orange bg-orange-50' : 'border-slate-200'}`}><strong>{campaign.persona}</strong><span className="ml-2 text-paycor-grey">{formatDate(campaign.createdAt)}</span></button>)}</div></div>}
    </div>
  );
}

function VoiceCallingPanel({ detail, onChanged }: { detail: FacilityDetail; onChanged: () => Promise<void> }) {
  const facility = detail.facility;
  const [calls, setCalls] = useState<VoiceCall[]>(detail.voiceCalls || []);
  const [selectedId, setSelectedId] = useState(detail.voiceCalls?.[0]?.id || '');
  const [phoneNumber, setPhoneNumber] = useState(detail.voiceCalls?.[0]?.phoneNumber || '');
  const [persona, setPersona] = useState<(typeof OUTREACH_PERSONAS)[number]>('COO / Administrator');
  const [customRole, setCustomRole] = useState('');
  const [knownContactName, setKnownContactName] = useState('');
  const [knownContactTitle, setKnownContactTitle] = useState('');
  const [knownContactEmail, setKnownContactEmail] = useState('');
  const [knownContactExtension, setKnownContactExtension] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [campaignTouchDay, setCampaignTouchDay] = useState<1|3|7>(1);
  const [businessLineConfirmed, setBusinessLineConfirmed] = useState(false);
  const [lawfulContactConfirmed, setLawfulContactConfirmed] = useState(false);
  const [aiDisclosureConfirmed, setAiDisclosureConfirmed] = useState(false);
  const [recordingConsentConfirmed, setRecordingConsentConfirmed] = useState(false);
  const [audioErrorId, setAudioErrorId] = useState('');
  const [starting, setStarting] = useState(false);
  const [syncingId, setSyncingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selected = useMemo(() => calls.find((call) => call.id === selectedId) || calls[0] || null, [calls, selectedId]);
  const selectedCampaign = useMemo(() => detail.campaigns.find((campaign) => campaign.id === campaignId) || null, [detail.campaigns, campaignId]);
  const selectedTouch = useMemo(() => selectedCampaign?.campaign.touches.find((touch) => touch.day === campaignTouchDay) || null, [selectedCampaign, campaignTouchDay]);
  const [outcome, setOutcome] = useState({
    capturedContactName: '', capturedContactTitle: '', capturedContactEmail: '', capturedContactExtension: '',
    appointmentStatus: 'none' as VoiceCall['appointmentStatus'], appointmentDetails: '', outcomeNotes: '',
  });

  useEffect(() => {
    setCalls(detail.voiceCalls || []);
    if (!selectedId && detail.voiceCalls?.[0]) setSelectedId(detail.voiceCalls[0].id);
  }, [detail.voiceCalls, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setOutcome({
      capturedContactName: selected.capturedContactName || '', capturedContactTitle: selected.capturedContactTitle || '',
      capturedContactEmail: selected.capturedContactEmail || '', capturedContactExtension: selected.capturedContactExtension || '',
      appointmentStatus: selected.appointmentStatus || 'none', appointmentDetails: selected.appointmentDetails || '',
      outcomeNotes: selected.outcomeNotes || '',
    });
  }, [selected]);

  const replaceCall = useCallback((call: VoiceCall) => {
    setCalls((current) => [call, ...current.filter((item) => item.id !== call.id)].sort((a, b) => b.createdAt - a.createdAt));
    setSelectedId(call.id);
  }, []);

  const syncCall = useCallback(async (id: string, quiet = false) => {
    if (!quiet) { setSyncingId(id); setError(''); }
    try {
      const response = await fetch(`/api/admin/voice-calls/${id}/sync`, { method: 'POST' });
      const payload = await response.json() as { call?: VoiceCall; error?: string };
      if (!response.ok || !payload.call) throw new Error(payload.error || 'Call status could not be updated.');
      replaceCall(payload.call);
      if (!quiet && !isLiveCall(payload.call.status)) setNotice('Call status and transcript are up to date.');
    } catch (syncError) {
      if (!quiet) setError(syncError instanceof Error ? syncError.message : 'Call status could not be updated.');
    } finally { if (!quiet) setSyncingId(''); }
  }, [replaceCall]);

  useEffect(() => {
    const active = calls.find((call) => isLiveCall(call.status));
    if (!active) return;
    const timer = window.setInterval(() => void syncCall(active.id, true), 10_000);
    return () => window.clearInterval(timer);
  }, [calls, syncCall]);

  const startCall = async () => {
    setStarting(true); setError(''); setNotice('');
    try {
      const resolvedPersona = persona === 'Other' ? customRole.trim() : persona;
      const response = await fetch('/api/admin/voice-calls', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ccn: facility.ccn, phoneNumber, persona: resolvedPersona, knownContactName, knownContactTitle,
          knownContactEmail, knownContactExtension, campaignId: campaignId || undefined,
          campaignTouchDay: campaignId ? campaignTouchDay : undefined,
          businessLineConfirmed, lawfulContactConfirmed, aiDisclosureConfirmed, recordingConsentConfirmed,
        }),
      });
      const payload = await response.json() as { call?: VoiceCall; error?: string };
      if (!response.ok || !payload.call) throw new Error(payload.error || 'The call could not be started.');
      replaceCall(payload.call);
      setNotice('The manually approved outbound call has started. Status will refresh automatically.');
      setBusinessLineConfirmed(false); setLawfulContactConfirmed(false); setAiDisclosureConfirmed(false); setRecordingConsentConfirmed(false);
      await onChanged();
    } catch (startError) { setError(startError instanceof Error ? startError.message : 'The call could not be started.'); }
    finally { setStarting(false); }
  };

  const saveOutcome = async () => {
    if (!selected) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/voice-calls/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(outcome),
      });
      const payload = await response.json() as { call?: VoiceCall; error?: string };
      if (!response.ok || !payload.call) throw new Error(payload.error || 'The call outcome could not be saved.');
      replaceCall(payload.call); setNotice('Call outcome saved. Appointment confirmation remains manual.'); await onChanged();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'The call outcome could not be saved.'); }
    finally { setSaving(false); }
  };

  const markDoNotCall = async () => {
    if (!selected || !window.confirm(`Prevent all future calls to ${formatPhone(selected.phoneNumber)}?`)) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/voice-calls/${selected.id}/do-not-call`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: outcome.outcomeNotes || 'Recipient requested no further calls.' }),
      });
      const payload = await response.json() as { call?: VoiceCall; error?: string };
      if (!response.ok || !payload.call) throw new Error(payload.error || 'The number could not be suppressed.');
      replaceCall(payload.call); setNotice('The number is now blocked from future outbound calls.'); await onChanged();
    } catch (suppressionError) { setError(suppressionError instanceof Error ? suppressionError.message : 'The number could not be suppressed.'); }
    finally { setSaving(false); }
  };

  const canStart = phoneNumber.trim() && (persona !== 'Other' || customRole.trim()) && businessLineConfirmed && lawfulContactConfirmed && aiDisclosureConfirmed && recordingConsentConfirmed && !starting;

  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50/40 p-5 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3"><div className="rounded-2xl bg-paycor-navy p-2.5 text-white"><Bot className="h-5 w-5" /></div><div><h3 className="text-base font-black">ElevenLabs outbound voice agent</h3><p className="mt-1 max-w-3xl text-xs leading-relaxed text-paycor-medium-grey">Place one manually approved call, navigate a facility phone tree, use a selected cadence touch, and request a 30-minute Calendly appointment. Calls are never sent in batches.</p></div></div>
        <div className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-[10px] font-bold text-sky-800"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Future call recordings are retained by ElevenLabs for 30 days and can be played here.</div>
      </div>

      {detail.doNotCallNumbers.length > 0 && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[10px] text-red-700"><Ban className="mr-1 inline h-3.5 w-3.5" />{detail.doNotCallNumbers.length} facility number{detail.doNotCallNumbers.length === 1 ? ' is' : 's are'} blocked from future calls.</div>}
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      {notice && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</div>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.18fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-black">Approve one call</h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FieldLabel label="Facility business phone"><input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className="admin-input" placeholder="(555) 555-0100" inputMode="tel" /></FieldLabel>
            <FieldLabel label="Role to request"><select value={persona} onChange={(event) => setPersona(event.target.value as typeof persona)} className="admin-input">{OUTREACH_PERSONAS.map((item) => <option key={item}>{item}</option>)}</select></FieldLabel>
            {persona === 'Other' && <FieldLabel label="Custom role"><input value={customRole} onChange={(event) => setCustomRole(event.target.value)} className="admin-input" /></FieldLabel>}
            <FieldLabel label="Known contact name (optional)"><input value={knownContactName} onChange={(event) => setKnownContactName(event.target.value)} className="admin-input" /></FieldLabel>
            <FieldLabel label="Known title (optional)"><input value={knownContactTitle} onChange={(event) => setKnownContactTitle(event.target.value)} className="admin-input" /></FieldLabel>
            <FieldLabel label="Known email (optional)"><input value={knownContactEmail} onChange={(event) => setKnownContactEmail(event.target.value)} className="admin-input" type="email" /></FieldLabel>
            <FieldLabel label="Known extension (optional)"><input value={knownContactExtension} onChange={(event) => setKnownContactExtension(event.target.value)} className="admin-input" /></FieldLabel>
            <FieldLabel label="Link saved cadence (optional)"><select value={campaignId} onChange={(event) => { setCampaignId(event.target.value); setCampaignTouchDay(1); }} className="admin-input"><option value="">No linked cadence</option>{detail.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.persona} · {new Date(campaign.createdAt).toLocaleDateString()}</option>)}</select></FieldLabel>
            {campaignId && <FieldLabel label="Cadence touch"><select value={campaignTouchDay} onChange={(event) => setCampaignTouchDay(Number(event.target.value) as 1|3|7)} className="admin-input"><option value={1}>Day 1</option><option value={3}>Day 3</option><option value={7}>Day 7</option></select></FieldLabel>}
          </div>
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-[10px] leading-relaxed text-sky-950">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>30-minute scheduling</strong><a href="https://calendly.com/dmaloy-paycor/30min" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-extrabold text-sky-800">Open Calendly <ExternalLink className="h-3 w-3" /></a></div>
            <p className="mt-1">The agent asks for this meeting length. If direct calendar booking is unavailable, it captures the preferred day, time window, timezone, and follow-up permission for you.</p>
          </div>
          {selectedTouch && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px]">
            <div className="flex items-center justify-between gap-2"><strong>Call brief preview · Day {selectedTouch.day}</strong><span className="text-paycor-grey">{selectedCampaign?.selectedFacts.length || 0} approved facts</span></div>
            <p className="mt-2 leading-relaxed text-paycor-medium-grey"><strong>Opener:</strong> {selectedTouch.liveCallOpener}</p>
            <p className="mt-2 leading-relaxed text-paycor-medium-grey"><strong>Voicemail:</strong> {selectedTouch.voicemail}</p>
          </div>}
          <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <CallAttestation checked={businessLineConfirmed} onChange={setBusinessLineConfirmed}>I verified this is a facility or other business line, not a personal or emergency number.</CallAttestation>
            <CallAttestation checked={lawfulContactConfirmed} onChange={setLawfulContactConfirmed}>I have a lawful basis to place this business call and have checked applicable consent and do-not-call requirements.</CallAttestation>
            <CallAttestation checked={aiDisclosureConfirmed} onChange={setAiDisclosureConfirmed}>I approve the opening disclosure that this is an AI assistant calling for Devin Maloy with Paycor.</CallAttestation>
            <CallAttestation checked={recordingConsentConfirmed} onChange={setRecordingConsentConfirmed}>I confirm recording is lawful for this call and any required notice or consent will be provided.</CallAttestation>
          </div>
          <button type="button" onClick={() => void startCall()} disabled={!canStart} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-paycor-navy px-5 py-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">{starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}{starting ? 'Starting approved call…' : 'Start approved call'}</button>
          <p className="mt-3 text-[9px] leading-relaxed text-paycor-grey">No live test call is placed during setup. The agent will dial only when you press this button after completing all confirmations.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="text-xs font-black">Call tracking</h4><p className="mt-1 text-[10px] text-paycor-grey">Live status, transcript, contact details, appointment outcome, and suppression.</p></div>{selected && <button type="button" onClick={() => void syncCall(selected.id)} disabled={syncingId === selected.id} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold"><RefreshCw className={`h-3.5 w-3.5 ${syncingId === selected.id ? 'animate-spin' : ''}`} />Sync now</button>}</div>
          {calls.length === 0 ? <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-xs text-paycor-grey">No calls have been placed for this facility.</div> : <>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{calls.map((call) => <button type="button" key={call.id} onClick={() => setSelectedId(call.id)} className={`shrink-0 rounded-xl border px-3 py-2 text-left text-[10px] ${selected?.id === call.id ? 'border-paycor-orange bg-orange-50' : 'border-slate-200'}`}><strong>{formatPhone(call.phoneNumber)}</strong><span className="ml-2 text-paycor-grey">{formatDate(call.createdAt)}</span><p className="mt-1"><CallStatus status={call.status} appointmentStatus={call.appointmentStatus} optedOut={call.optedOut} /></p></button>)}</div>
            {selected && <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"><Metric label="Status" value={callStatusLabel(selected.status)} /><Metric label="Duration" value={selected.durationSeconds == null ? '—' : `${selected.durationSeconds}s`} /><Metric label="Connection" value={connectionOutcomeLabel(selected.connectionOutcome)} /><Metric label="Voicemail" value={selected.voicemailLeft ? 'Left' : 'No'} /><Metric label="Appointment" value={appointmentLabel(selected.appointmentStatus)} /><Metric label="Result" value={selected.callSuccessful == null ? 'Not analyzed' : selected.callSuccessful ? 'Successful' : 'Unsuccessful'} /></div>
              {selected.failureReason && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[10px] text-red-700"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{selected.failureReason}</div>}
              {selected.summary && <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-extrabold uppercase tracking-wider text-paycor-grey">Call summary</p><p className="mt-2 text-[11px] leading-relaxed text-paycor-medium-grey">{selected.summary}</p></div>}
              {(selected.preferredDay || selected.preferredTimeWindow || selected.preferredTimezone || selected.phoneTreePath) && <div className="grid gap-2 sm:grid-cols-2">
                {(selected.preferredDay || selected.preferredTimeWindow || selected.preferredTimezone) && <div className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-950"><strong>Scheduling preference</strong><p className="mt-1">{[selected.preferredDay, selected.preferredTimeWindow, selected.preferredTimezone].filter(Boolean).join(' · ')}</p><p className="mt-1">Follow-up permission: {selected.followUpPermission == null ? 'Not captured' : selected.followUpPermission ? 'Yes' : 'No'}</p></div>}
                {selected.phoneTreePath && <div className="rounded-xl bg-sky-50 p-3 text-[10px] text-sky-950"><strong>Phone-tree path</strong><p className="mt-1">{selected.phoneTreePath}</p></div>}
              </div>}
              <div className="flex flex-wrap gap-2"><a href={selected.callBrief.calendlyUrl || 'https://calendly.com/dmaloy-paycor/30min'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-extrabold text-sky-800"><CalendarCheck className="h-3.5 w-3.5" />Open 30-minute Calendly</a>{selected.providerConversationUrl && <a href={selected.providerConversationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-extrabold text-paycor-medium-grey"><ExternalLink className="h-3.5 w-3.5" />Open in ElevenLabs</a>}</div>
              {selected.conversationId && <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <div className="flex items-center gap-2 text-[10px] font-extrabold text-sky-900"><Headphones className="h-4 w-4" />Call recording</div>
                <audio key={selected.id} className="mt-2 w-full" controls preload="metadata" src={`/api/admin/voice-calls/${selected.id}/audio`} onError={() => setAudioErrorId(selected.id)} onCanPlay={() => setAudioErrorId('')} />
                {audioErrorId === selected.id && <p className="mt-2 text-[10px] leading-relaxed text-amber-800">No recording is available for this call. Calls placed before recording was enabled cannot be recovered; use the transcript above instead.</p>}
              </div>}
              {selected.callBrief.opener && <details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-[10px] font-extrabold">Exact call brief used {selected.campaignTouchDay ? `· Day ${selected.campaignTouchDay}` : ''}</summary><div className="mt-3 space-y-3 text-[10px] leading-relaxed text-paycor-medium-grey"><p><strong>Opener:</strong> {selected.callBrief.opener}</p><p><strong>Voicemail:</strong> {selected.callBrief.voicemail}</p>{Boolean(selected.callBrief.selectedFacts?.length) && <ul className="list-disc space-y-1 pl-4">{selected.callBrief.selectedFacts?.map((fact) => <li key={fact.id}>{fact.label}: {fact.value} <span className="text-paycor-grey">({fact.source})</span></li>)}</ul>}</div></details>}
              <details className="rounded-xl border border-slate-200 p-3" open={selected.transcript.length > 0}><summary className="cursor-pointer text-[10px] font-extrabold">Transcript ({selected.transcript.length})</summary><div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{selected.transcript.length ? selected.transcript.map((entry, index) => <div key={`${entry.atSeconds}-${index}`} className={`rounded-xl p-2.5 text-[10px] ${entry.role === 'agent' ? 'bg-sky-50' : 'bg-slate-50'}`}><p className="font-extrabold uppercase tracking-wider text-paycor-grey">{entry.role}{entry.atSeconds == null ? '' : ` · ${Math.round(entry.atSeconds)}s`}</p><p className="mt-1 whitespace-pre-wrap leading-relaxed text-paycor-medium-grey">{entry.text}</p></div>) : <p className="text-[10px] text-paycor-grey">Transcript will appear after ElevenLabs processes the call.</p>}</div></details>
              <div className="border-t border-slate-200 pt-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-paycor-grey">Verified outcome</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><FieldLabel label="Contact found"><input className="admin-input" value={outcome.capturedContactName} onChange={(event) => setOutcome({ ...outcome, capturedContactName: event.target.value })} /></FieldLabel><FieldLabel label="Title"><input className="admin-input" value={outcome.capturedContactTitle} onChange={(event) => setOutcome({ ...outcome, capturedContactTitle: event.target.value })} /></FieldLabel><FieldLabel label="Email"><input className="admin-input" type="email" value={outcome.capturedContactEmail} onChange={(event) => setOutcome({ ...outcome, capturedContactEmail: event.target.value })} /></FieldLabel><FieldLabel label="Extension"><input className="admin-input" value={outcome.capturedContactExtension} onChange={(event) => setOutcome({ ...outcome, capturedContactExtension: event.target.value })} /></FieldLabel><FieldLabel label="Appointment status"><select className="admin-input" value={outcome.appointmentStatus} onChange={(event) => setOutcome({ ...outcome, appointmentStatus: event.target.value as VoiceCall['appointmentStatus'] })}><option value="none">Not requested / none</option><option value="pending">Requested — needs my confirmation</option><option value="confirmed">Manually confirmed</option><option value="declined">Declined</option></select></FieldLabel><FieldLabel label="Appointment details"><input className="admin-input" value={outcome.appointmentDetails} onChange={(event) => setOutcome({ ...outcome, appointmentDetails: event.target.value })} placeholder="Proposed time or follow-up needed" /></FieldLabel></div><div className="mt-3"><FieldLabel label="Outcome notes"><textarea className="admin-input resize-y" rows={3} value={outcome.outcomeNotes} onChange={(event) => setOutcome({ ...outcome, outcomeNotes: event.target.value })} /></FieldLabel></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void saveOutcome()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-paycor-orange px-4 py-2.5 text-[10px] font-extrabold text-white"><Save className="h-3.5 w-3.5" />Save verified outcome</button><button type="button" onClick={() => void markDoNotCall()} disabled={saving || selected.optedOut} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[10px] font-extrabold text-red-700 disabled:opacity-50"><Ban className="h-3.5 w-3.5" />{selected.optedOut ? 'Do not call' : 'Mark do not call'}</button></div></div>
            </div>}
          </>}
        </div>
      </div>
    </section>
  );
}

function CallAttestation({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return <label className="flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed text-amber-900"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 accent-[#F58220]" /><span>{children}</span></label>;
}

function CallStatus({ status, appointmentStatus, optedOut }: { status: string; appointmentStatus: VoiceCall['appointmentStatus']; optedOut: boolean }) {
  if (optedOut) return <span className="font-bold text-red-700">Do not call</span>;
  if (appointmentStatus === 'pending') return <span className="font-bold text-amber-700">Appointment pending</span>;
  if (appointmentStatus === 'confirmed') return <span className="font-bold text-emerald-700">Appointment confirmed</span>;
  return <span className={isLiveCall(status) ? 'font-bold text-sky-700' : 'text-paycor-grey'}>{callStatusLabel(status)}</span>;
}

function CampaignView({ saved, copied, onCopy }: { saved: SavedCampaign; copied: string; onCopy: (value: string, key: string) => Promise<void> }) {
  return <section className="border-t border-slate-200 pt-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-paycor-orange">Saved cadence</p><h3 className="mt-1 text-xl font-black">{saved.campaign.campaignTitle}</h3><p className="mt-1 max-w-3xl text-xs leading-relaxed text-paycor-medium-grey">{saved.campaign.strategySummary}</p></div><CopyButton label={copied === 'all' ? 'Copied' : 'Copy full cadence'} onClick={() => onCopy(campaignToPlainText(saved.campaign), 'all')} /></div><div className="mt-5 grid gap-4 xl:grid-cols-3">{saved.campaign.touches.map((touch) => <article key={touch.day} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><span className="rounded-full bg-paycor-charcoal px-2.5 py-1 text-[9px] font-extrabold text-white">DAY {touch.day}</span><CopyButton compact label={copied === `touch-${touch.day}` ? 'Copied' : 'Copy'} onClick={() => onCopy(campaignToPlainText({ ...saved.campaign, touches: [touch] }), `touch-${touch.day}`)} /></div><Asset title="Email" icon={<Mail />} action={() => onCopy(`Subject: ${touch.subject}\n\n${touch.email}`, `email-${touch.day}`)} copied={copied === `email-${touch.day}`}><p className="font-extrabold">Subject: {touch.subject}</p><p className="mt-2 whitespace-pre-wrap leading-relaxed text-paycor-medium-grey">{touch.email}</p></Asset><Asset title="Live opener" icon={<Phone />} action={() => onCopy(touch.liveCallOpener, `call-${touch.day}`)} copied={copied === `call-${touch.day}`}><p className="leading-relaxed text-paycor-medium-grey">{touch.liveCallOpener}</p></Asset><Asset title="Voicemail" icon={<Phone />} action={() => onCopy(touch.voicemail, `vm-${touch.day}`)} copied={copied === `vm-${touch.day}`}><p className="leading-relaxed text-paycor-medium-grey">{touch.voicemail}</p></Asset><div className="mt-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-paycor-grey">Discovery questions</p><ol className="mt-2 space-y-1.5 pl-4 text-[11px] text-paycor-medium-grey">{touch.discoveryQuestions.map((question) => <li key={question} className="list-decimal">{question}</li>)}</ol></div><div className="mt-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-paycor-grey">Objections</p><div className="mt-2 space-y-2">{touch.objectionResponses.map((item) => <div key={item.objection} className="rounded-xl bg-white p-3 text-[10px]"><strong>{item.objection}</strong><p className="mt-1 leading-relaxed text-paycor-medium-grey">{item.response}</p></div>)}</div></div></article>)}</div></section>;
}

function Asset({ title, icon, action, copied, children }: { title: string; icon: React.ReactNode; action: () => void; copied: boolean; children: React.ReactNode }) { return <div className="mt-4 border-t border-slate-200 pt-4 text-[11px]"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-paycor-grey">{icon}{title}</span><button type="button" onClick={action} className="text-[9px] font-bold text-paycor-orange">{copied ? 'Copied' : 'Copy'}</button></div>{children}</div>; }
function CopyButton({ label, onClick, compact = false }: { label: string; onClick: () => void; compact?: boolean }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white font-bold ${compact ? 'px-2 py-1 text-[9px]' : 'px-3 py-2 text-xs'}`}><Clipboard className="h-3.5 w-3.5" />{label}</button>; }
function InfoPanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border border-slate-200 p-4"><h3 className="mb-4 flex items-center gap-2 text-xs font-black text-paycor-charcoal"><span className="text-paycor-orange">{icon}</span>{title}</h3>{children}</section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-paycor-grey">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>; }
function SummaryCard({ icon, label, value, tone = 'slate' }: { icon: React.ReactNode; label: string; value: number; tone?: 'slate'|'amber'|'green'|'blue' }) { const tones = { slate: 'bg-slate-100 text-paycor-charcoal', amber: 'bg-amber-100 text-amber-800', green: 'bg-emerald-100 text-emerald-800', blue: 'bg-sky-100 text-sky-800' }; return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className={`inline-flex rounded-xl p-2 [&>svg]:h-4 [&>svg]:w-4 ${tones[tone]}`}>{icon}</div><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-paycor-grey">{label}</p></div>; }
function StatusBadge({ complete }: { complete: boolean }) { return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{complete ? <Check className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{complete ? 'Completed' : 'Needs completion'}</span>; }
function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<[string,string]> }) { return <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-paycor-orange">{options.map(([item,label]) => <option key={item} value={item}>{label}</option>)}</select>; }
function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-[10px] font-extrabold text-paycor-medium-grey">{label}</span>{children}</label>; }
function formatDate(value: number | null) { if (!value) return '—'; return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
function starValue(value: unknown) { return value == null ? '—' : `${value} ★`; }
function displayValue(value: unknown) { return value == null ? '—' : Number(value).toLocaleString(); }
function eventLabel(type: string) { return ({ facility_applied: 'CMS facility applied', progress_updated: 'Calculator progress updated', report_opened: 'Customer report opened', report_downloaded: 'PDF report downloaded' } as Record<string,string>)[type] || type; }
function isLiveCall(status: string) { return ['queued', 'initiated', 'in-progress', 'processing'].includes(status); }
function callStatusLabel(status: string) { return ({ queued: 'Queued', initiated: 'Dialing', 'in-progress': 'In progress', processing: 'Processing', done: 'Completed', failed: 'Failed' } as Record<string,string>)[status] || status; }
function appointmentLabel(status: VoiceCall['appointmentStatus']) { return ({ none: 'None', pending: 'Needs confirmation', confirmed: 'Booked / confirmed', declined: 'Declined' } as Record<string,string>)[status] || status; }
function connectionOutcomeLabel(value: string | null) { return value ? ({ phone_tree_failed: 'Phone tree failed', receptionist_only: 'Receptionist only', transferred: 'Transferred', decision_maker_reached: 'Decision maker', voicemail_left: 'Voicemail', wrong_number: 'Wrong number', no_answer: 'No answer', do_not_call: 'Do not call' } as Record<string,string>)[value] || value : 'Not analyzed'; }
function formatPhone(value: string) { const digits = value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''); return digits.length === 10 ? `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}` : value; }
