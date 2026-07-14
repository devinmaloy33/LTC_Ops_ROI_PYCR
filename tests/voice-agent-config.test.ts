import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRecommendedAgentPatch, VOICE_AGENT_FIRST_MESSAGE, VOICE_AGENT_PROMPT } from '../lib/voice-agent-config';

test('keeps the first message blank so an IVR can speak first', () => {
  assert.equal(VOICE_AGENT_FIRST_MESSAGE, '');
});

test('coordinates disclosure, short greetings, and brevity in the fallback agent prompt', () => {
  assert.match(VOICE_AGENT_PROMPT, /Alex, Devin Maloy's AI assistant at Paycor/);
  assert.match(VOICE_AGENT_PROMPT, /facility name, or any short greeting/);
  assert.match(VOICE_AGENT_PROMPT, /5–15 spoken words/);
});

test('preserves audio storage settings when the fallback configuration script runs', () => {
  const patch = buildRecommendedAgentPatch({
    platform_settings: { privacy: { record_voice: true } },
  }) as { platform_settings: { privacy?: { record_voice?: boolean } } };
  assert.equal(patch.platform_settings.privacy?.record_voice, undefined);
});
