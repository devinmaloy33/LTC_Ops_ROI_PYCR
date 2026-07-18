// lib/calendly.ts
// Calendly v2 API integration — autonomous scheduling from confirmed call outcomes.
// Reads: process.env.CALENDLY_API_TOKEN (set in ChatGPT Sites → Secrets)

const CALENDLY_BASE = 'https://api.calendly.com';
const SCHEDULING_URL_SLUG = 'dmaloy-paycor/30min';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalendlyBookingResult =
  | { ok: true; bookingUrl: string; startTime: string; eventTypeUri: string }
  | { ok: false; reason: string };

type CalendlySlot = { start_time: string; end_time: string };

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Called after a confirmed call outcome. Finds your event type, checks
 * availability honoring the prospect's stated day/time preference, and
 * creates a single-use scheduling link to send in the confirmation email.
 */
export async function bookAppointmentFromCallOutcome(input: {
  preferredDay?: string | null;
  preferredTimeWindow?: string | null;
  preferredTimezone?: string | null;
  inviteeName: string;
  inviteeEmail: string;
  facilityName: string;
  callRecordId: string;
}): Promise<CalendlyBookingResult> {
  const pat = process.env.CALENDLY_API_TOKEN;
  if (!pat) {
    return { ok: false, reason: 'CALENDLY_API_TOKEN is not configured.' };
  }

  // Step 1: Get your Calendly user URI
  let userUri: string;
  try {
    userUri = await getCalendlyUserUri(pat);
  } catch (err) {
    return { ok: false, reason: `Failed to fetch Calendly user: ${String(err)}` };
  }

  // Step 2: Find the 30-min event type URI
  let eventTypeUri: string;
  try {
    eventTypeUri = await getEventTypeUri(pat, userUri, SCHEDULING_URL_SLUG);
  } catch (err) {
    return { ok: false, reason: `Failed to find event type: ${String(err)}` };
  }

  // Step 3: Get available slots, ranked by prospect's preference
  let slots: CalendlySlot[];
  try {
    slots = await getAvailableSlots(
      pat,
      eventTypeUri,
      input.preferredDay,
      input.preferredTimeWindow,
      input.preferredTimezone,
    );
  } catch (err) {
    return { ok: false, reason: `Failed to fetch availability: ${String(err)}` };
  }

  if (slots.length === 0) {
    return { ok: false, reason: 'No available slots in the next 14 days.' };
  }

  // Step 4: Create a single-use scheduling link
  try {
    const result = await createSingleUseLink(pat, eventTypeUri);
    return {
      ok: true,
      bookingUrl: result.bookingUrl,
      startTime: slots[0].start_time,
      eventTypeUri,
    };
  } catch (err) {
    return { ok: false, reason: `Failed to create scheduling link: ${String(err)}` };
  }
}

// ─── Calendly API calls ───────────────────────────────────────────────────────

async function getCalendlyUserUri(pat: string): Promise<string> {
  const res = await fetch(`${CALENDLY_BASE}/users/me`, {
    headers: authHeaders(pat),
  });
  if (!res.ok) throw new Error(`/users/me returned ${res.status}`);
  const data = (await res.json()) as { resource: { uri: string } };
  const uri = data.resource?.uri;
  if (!uri) throw new Error('No user URI returned from Calendly');
  return uri;
}

async function getEventTypeUri(
  pat: string,
  userUri: string,
  slug: string,
): Promise<string> {
  const params = new URLSearchParams({ user: userUri, active: 'true' });
  const res = await fetch(`${CALENDLY_BASE}/event_types?${params}`, {
    headers: authHeaders(pat),
  });
  if (!res.ok) throw new Error(`/event_types returned ${res.status}`);
  const data = (await res.json()) as {
    collection: Array<{ uri: string; scheduling_url: string }>;
  };
  const match = data.collection.find((et) =>
    et.scheduling_url.includes(slug),
  );
  if (!match) throw new Error(`No event type found matching slug: ${slug}`);
  return match.uri;
}

async function getAvailableSlots(
  pat: string,
  eventTypeUri: string,
  preferredDay?: string | null,
  preferredTimeWindow?: string | null,
  preferredTimezone?: string | null,
): Promise<CalendlySlot[]> {
  const timezone = normalizeTimezone(preferredTimezone) ?? 'America/New_York';
  const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const endTime = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    event_type: eventTypeUri,
    start_time: startTime,
    end_time: endTime,
    timezone,
  });

  const res = await fetch(
    `${CALENDLY_BASE}/event_type_available_times?${params}`,
    { headers: authHeaders(pat) },
  );
  if (!res.ok) throw new Error(`/event_type_available_times returned ${res.status}`);

  const data = (await res.json()) as { collection: CalendlySlot[] };
  const slots = data.collection ?? [];
  return rankByPreference(slots, preferredDay, preferredTimeWindow);
}

async function createSingleUseLink(
  pat: string,
  eventTypeUri: string,
): Promise<{ bookingUrl: string }> {
  const res = await fetch(`${CALENDLY_BASE}/scheduling_links`, {
    method: 'POST',
    headers: authHeaders(pat),
    body: JSON.stringify({
      max_event_count: 1,
      owner: eventTypeUri,
      owner_type: 'EventType',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`/scheduling_links returned ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { resource: { booking_url: string } };
  const bookingUrl = data.resource?.booking_url;
  if (!bookingUrl) throw new Error('No booking_url in Calendly response');
  return { bookingUrl };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(pat: string) {
  return {
    Authorization: `Bearer ${pat}`,
    'Content-Type': 'application/json',
  };
}

function rankByPreference(
  slots: CalendlySlot[],
  preferredDay?: string | null,
  preferredTimeWindow?: string | null,
): CalendlySlot[] {
  if (!preferredDay && !preferredTimeWindow) return slots;
  const dayNum = parseDayPreference(preferredDay);
  const window = parseTimeWindow(preferredTimeWindow);
  return slots
    .map((slot) => {
      const d = new Date(slot.start_time);
      const hour = d.getUTCHours();
      let score = 0;
      if (dayNum !== null && d.getUTCDay() === dayNum) score += 10;
      if (window === 'morning' && hour >= 12 && hour < 16) score += 5;   // 8–12 ET = 12–16 UTC
      if (window === 'afternoon' && hour >= 16 && hour < 21) score += 5; // 12–5 ET = 16–21 UTC
      return { slot, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.slot);
}

function parseDayPreference(value?: string | null): number | null {
  if (!value) return null;
  const v = value.toLowerCase();
  const days: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4, thur: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };
  for (const [key, num] of Object.entries(days)) {
    if (v.includes(key)) return num;
  }
  return null;
}

function parseTimeWindow(value?: string | null): 'morning' | 'afternoon' | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes('morning') || v.includes('am')) return 'morning';
  if (v.includes('afternoon') || v.includes('pm')) return 'afternoon';
  return null;
}

function normalizeTimezone(value?: string | null): string | null {
  if (!value) return null;
  const aliases: Record<string, string> = {
    eastern: 'America/New_York', est: 'America/New_York', edt: 'America/New_York',
    central: 'America/Chicago', cst: 'America/Chicago', cdt: 'America/Chicago',
    mountain: 'America/Denver', mst: 'America/Denver',
    pacific: 'America/Los_Angeles', pst: 'America/Los_Angeles', pdt: 'America/Los_Angeles',
  };
  return aliases[value.trim().toLowerCase()] ?? value.trim();
}
