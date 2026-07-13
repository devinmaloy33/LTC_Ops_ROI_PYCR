import assert from 'node:assert/strict';
import test from 'node:test';
import { extractOutcome } from '../lib/call-tracking';

test('extractOutcome maps a completed Calendly booking to confirmed', () => {
  const outcome = extractOutcome({
    connection_outcome: { value: 'decision_maker_reached' },
    appointment_interest: { value: 'accepted' },
    appointment_booking_status: { value: 'booked' },
    appointment_time: { value: 'July 20, 2026 at 2:00 PM Eastern' },
    follow_up_permission: { value: true },
    contact_email: { value: 'leader@example.com' },
  });
  assert.equal(outcome.connectionOutcome, 'decision_maker_reached');
  assert.equal(outcome.appointmentStatus, 'confirmed');
  assert.match(outcome.appointmentDetails || '', /Eastern/);
  assert.equal(outcome.followUpPermission, true);
  assert.equal(outcome.contactEmail, 'leader@example.com');
});

test('extractOutcome maps interest without booking to pending', () => {
  const outcome = extractOutcome({
    appointment_interest: 'tentative', appointment_booking_status: 'pending_confirmation',
    preferred_day: 'Tuesday', preferred_time_window: 'afternoon', preferred_timezone: 'Eastern',
  });
  assert.equal(outcome.appointmentStatus, 'pending');
  assert.equal(outcome.preferredDay, 'Tuesday');
});

test('extractOutcome recognizes opt-out and invalid contact email', () => {
  const outcome = extractOutcome({ connection_outcome: 'do_not_call', opt_out: true, contact_email: 'not-an-email' });
  assert.equal(outcome.optOut, true);
  assert.equal(outcome.contactEmail, null);
});
