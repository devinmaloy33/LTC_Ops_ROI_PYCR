import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCallBrief, callBriefDynamicVariables } from '../lib/call-brief';

const campaign = {
  campaignTitle: 'Administrator outreach', strategySummary: 'Use one verified fact.',
  touches: [1, 3, 7].map((day) => ({
    day, subject: `Day ${day} note`, email: 'x',
    liveCallOpener: `Hi, this is Alex, Devin Maloy's AI assistant at Paycor. Approved opener for day ${day}.`,
    voicemail: `Hi, this is Alex, Devin Maloy's AI assistant at Paycor. Approved voicemail for day ${day}.`,
    discoveryQuestions: ['Question one?', 'Question two?', 'Question three?'],
    objectionResponses: [{ objection: 'Busy', response: 'I understand.' }, { objection: 'Email me', response: 'Of course.' }, { objection: 'No interest', response: 'Understood.' }],
  })),
};

test('buildCallBrief selects the requested saved cadence touch and preserves fact provenance', () => {
  const brief = buildCallBrief({
    facilityName: 'Example LTC', state: 'IN', targetRole: 'COO / Administrator', campaignId: 'campaign-1',
    campaignTouchDay: 3, campaignJson: campaign,
    selectedFacts: [{ id: 'cms.overall', label: 'Overall rating', value: '4 of 5 stars', source: 'CMS-reported' }],
    callbackPhone: '2607971814', now: 100,
  });
  assert.equal(brief.campaignTouchDay, 3);
  assert.match(brief.opener, /Approved opener for day 3/);
  assert.match(brief.voicemail, /260-797-1814/);
  assert.equal(brief.selectedFacts[0].source, 'CMS-reported');
  const variables = callBriefDynamicVariables(brief, 'call-1');
  assert.equal(variables._call_record_id_, 'call-1');
  assert.match(variables._facility_fact_1_, /CMS-reported/);
  assert.equal(variables._appointment_length_, '30 minutes');
});

test('buildCallBrief rejects an invalid campaign touch', () => {
  assert.throws(() => buildCallBrief({
    facilityName: 'Example LTC', state: 'IN', targetRole: 'COO', campaignId: 'campaign-1',
    campaignTouchDay: 2, campaignJson: campaign,
  }), /Day 1, Day 3, or Day 7/);
});

test('buildCallBrief provides a safe generic fallback without a campaign', () => {
  const brief = buildCallBrief({ facilityName: 'Example LTC', state: 'OH', targetRole: 'CFO / Finance' });
  assert.equal(brief.campaignId, null);
  assert.equal(brief.campaignTouchDay, null);
  assert.match(brief.opener, /AI assistant/);
  assert.equal(brief.calendlyUrl, 'https://calendly.com/dmaloy-paycor/30min');
});

test('buildCallBrief replaces legacy phone scripts that conflict with disclosure or Calendly duration', () => {
  const legacyCampaign = structuredClone(campaign);
  legacyCampaign.touches[0].liveCallOpener = 'Hi, this is [Name] with Paycor. Could we schedule a five-minute call?';
  legacyCampaign.touches[0].voicemail = 'Hi, this is [Name] from Paycor. Call me at [Phone].';
  const brief = buildCallBrief({
    facilityName: 'Example LTC', state: 'IN', targetRole: 'CFO', campaignId: 'legacy',
    campaignTouchDay: 1, campaignJson: legacyCampaign,
  });
  assert.match(brief.opener, /Alex, Devin Maloy's AI assistant at Paycor/);
  assert.doesNotMatch(brief.opener, /five-minute|\[Name\]/i);
  assert.match(brief.voicemail, /Alex, Devin Maloy's AI assistant at Paycor/);
});
