export type ClientActivityPayload = {
  eventType: 'facility_applied' | 'progress_updated' | 'report_opened' | 'report_downloaded';
  ccn: string;
  currentStep?: number;
  isComplete?: boolean;
  missingFields?: string[];
  calculatorSnapshot?: Record<string, number | null>;
};

export async function trackFacilityActivity(payload: ClientActivityPayload): Promise<void> {
  if (!/^\d{6}$/.test(payload.ccn)) return;
  try {
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Activity tracking is intentionally best-effort and never blocks the calculator.
  }
}
