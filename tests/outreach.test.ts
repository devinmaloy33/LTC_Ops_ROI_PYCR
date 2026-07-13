import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAndValidateCampaign, OutreachCampaign } from '../lib/outreach';

const optOut = "If this isn't relevant, reply no thanks and I won't follow up.";
const facts = [{ id: 'cms.overall_rating', label: 'Overall rating', value: '3 of 5 stars', source: 'CMS-reported' as const }];

function words(count: number) {
  return Array.from({ length: count }, (_, index) => `word${index + 1}`).join(' ');
}

function validCampaign(): OutreachCampaign {
  return {
    campaignTitle: 'Facility leadership conversation',
    strategySummary: 'Use one verified CMS fact to invite a low-pressure operational conversation.',
    touches: ([1, 3, 7] as const).map((day) => ({
      day,
      subject: 'A brief staffing question',
      email: `${words(65)} ${optOut}`,
      liveCallOpener: words(50),
      voicemail: words(28),
      discoveryQuestions: ['What is the current priority?', 'How is progress measured?', 'Would a comparison be useful?'],
      objectionResponses: [
        { objection: 'Not a priority', response: 'Understood. May I check back later?' },
        { objection: 'Already covered', response: 'That makes sense. Would a benchmark still help?' },
        { objection: 'Send information', response: 'Happy to. Which topic would be most useful?' },
      ],
    })),
  };
}

test('accepts a complete three-touch cadence with selected facts', () => {
  const result = parseAndValidateCampaign(JSON.stringify(validCampaign()), facts, optOut);
  assert.equal(result.errors.length, 0);
  assert.equal(result.campaign?.touches.length, 3);
});

test('rejects quantified claims that were not selected', () => {
  const campaign = validCampaign();
  campaign.touches[0].email = campaign.touches[0].email.replace('word1', 'An 87% result');
  const result = parseAndValidateCampaign(JSON.stringify(campaign), facts, optOut);
  assert.ok(result.errors.some((error) => error.includes('Unsupported quantified claim: 87%')));
});

test('rejects missing opt-out language and malformed cadence days', () => {
  const campaign = validCampaign();
  campaign.touches[0].email = words(70);
  campaign.touches[1].day = 1;
  const result = parseAndValidateCampaign(JSON.stringify(campaign), facts, optOut);
  assert.ok(result.errors.some((error) => error.includes('days 1, 3 and 7')));
  assert.ok(result.errors.some((error) => error.includes('opt-out line')));
});
