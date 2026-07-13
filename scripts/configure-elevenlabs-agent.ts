import { buildRecommendedAgentPatch } from '../lib/voice-agent-config';

const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
const webhookId = process.env.ELEVENLABS_POST_CALL_WEBHOOK_ID;

if (!apiKey || !agentId) throw new Error('ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are required.');

const currentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, {
  headers: { 'xi-api-key': apiKey },
});
if (!currentResponse.ok) throw new Error(`Could not read the agent (${currentResponse.status}).`);
const current = await currentResponse.json() as Record<string, unknown>;

const updateResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
  body: JSON.stringify(buildRecommendedAgentPatch(current, webhookId)),
});
const result = await updateResponse.json().catch(() => ({})) as Record<string, unknown>;
if (!updateResponse.ok) throw new Error(`Could not update the agent (${updateResponse.status}): ${JSON.stringify(result)}`);

console.log(JSON.stringify({ agentId, updated: true, webhookAttached: Boolean(webhookId) }));
