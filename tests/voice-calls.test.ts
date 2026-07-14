import assert from 'node:assert/strict';
import test from 'node:test';
import { isActiveCallStatus, normalizeConversation, normalizeUsBusinessPhone, serializeVoiceCall } from '../lib/voice-calls';

test('normalizes U.S. business numbers to E.164', () => {
  assert.equal(normalizeUsBusinessPhone('(517) 760-5337'), '+15177605337');
  assert.equal(normalizeUsBusinessPhone('1-517-760-5337'), '+15177605337');
  assert.equal(normalizeUsBusinessPhone('+1 517 760 5337'), '+15177605337');
});

test('rejects missing, international, short, and extension-only numbers', () => {
  assert.equal(normalizeUsBusinessPhone(''), null);
  assert.equal(normalizeUsBusinessPhone('+44 20 7946 0958'), null);
  assert.equal(normalizeUsBusinessPhone('911'), null);
  assert.equal(normalizeUsBusinessPhone('x203'), null);
});

test('maps ElevenLabs conversation details into the dashboard record', () => {
  const result = normalizeConversation({
    status: 'done',
    transcript: [
      { role: 'agent', message: 'Hello', time_in_call_secs: 1.4 },
      { role: 'user', message: 'Please hold', time_in_call_secs: 4 },
      { role: 'agent', message: '' },
    ],
    metadata: { call_duration_secs: 38, cost: 12.3 },
    analysis: { call_successful: 'success', transcript_summary: 'Reached the administrator office.' },
  });
  assert.equal(result.status, 'done');
  assert.equal(result.transcript.length, 2);
  assert.equal(result.durationSeconds, 38);
  assert.equal(result.costCredits, 12);
  assert.equal(result.successful, true);
  assert.equal(result.summary, 'Reached the administrator office.');
});

test('recognizes only nonterminal call statuses as active', () => {
  for (const status of ['queued', 'initiated', 'in-progress', 'processing']) assert.equal(isActiveCallStatus(status), true);
  for (const status of ['done', 'failed', 'unknown']) assert.equal(isActiveCallStatus(status), false);
});

test('builds the authenticated-provider conversation link without exposing the API key', () => {
  const call = serializeVoiceCall({
    id: 'call-1', ccn: '123456', phone_number: '+15177605337', persona: 'CFO', status: 'done',
    agent_id: 'agent_example', conversation_id: 'conv_example', compliance_attested_at: 1,
    created_at: 1, updated_at: 1,
  });
  assert.equal(call.providerConversationUrl, 'https://elevenlabs.io/app/agents/agents/agent_example/history/conv_example');
});
