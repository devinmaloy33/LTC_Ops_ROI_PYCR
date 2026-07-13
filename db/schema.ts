import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const facilities = sqliteTable(
  'facilities',
  {
    ccn: text('ccn').primaryKey(),
    facilityName: text('facility_name').notNull(),
    legalBusinessName: text('legal_business_name'),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    zip: text('zip'),
    chainName: text('chain_name'),
    chainFacilities: integer('chain_facilities'),
    beds: integer('beds'),
    residents: integer('residents'),
    overallRating: integer('overall_rating'),
    staffingRating: integer('staffing_rating'),
    healthInspectionRating: integer('health_inspection_rating'),
    qualityMeasureRating: integer('quality_measure_rating'),
    turnoverRate: integer('turnover_rate'),
    rnTurnover: integer('rn_turnover'),
    totalFines: integer('total_fines'),
    healthDeficiencies: integer('health_deficiencies'),
    cmsRetrievedAt: integer('cms_retrieved_at', { mode: 'timestamp_ms' }).notNull(),
    firstSeenAt: integer('first_seen_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('facilities_state_idx').on(table.state),
    index('facilities_last_seen_idx').on(table.lastSeenAt),
  ],
);

export const facilityEngagements = sqliteTable(
  'facility_engagements',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    ccn: text('ccn').notNull().references(() => facilities.ccn, { onDelete: 'cascade' }),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    lastActivityAt: integer('last_activity_at', { mode: 'timestamp_ms' }).notNull(),
    currentStep: integer('current_step').notNull().default(1),
    isComplete: integer('is_complete', { mode: 'boolean' }).notNull().default(false),
    missingFieldsJson: text('missing_fields_json').notNull().default('[]'),
    calculatorSnapshotJson: text('calculator_snapshot_json'),
    downloadCount: integer('download_count').notNull().default(0),
    lastDownloadedAt: integer('last_downloaded_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('facility_engagements_session_ccn_uidx').on(table.sessionId, table.ccn),
    index('facility_engagements_ccn_idx').on(table.ccn),
    index('facility_engagements_last_activity_idx').on(table.lastActivityAt),
  ],
);

export const facilityEvents = sqliteTable(
  'facility_events',
  {
    id: text('id').primaryKey(),
    engagementId: text('engagement_id').notNull().references(() => facilityEngagements.id, { onDelete: 'cascade' }),
    ccn: text('ccn').notNull().references(() => facilities.ccn, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    metadataJson: text('metadata_json').notNull().default('{}'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('facility_events_ccn_time_idx').on(table.ccn, table.occurredAt),
    index('facility_events_engagement_idx').on(table.engagementId),
  ],
);

export const outreachCampaigns = sqliteTable(
  'outreach_campaigns',
  {
    id: text('id').primaryKey(),
    ccn: text('ccn').notNull().references(() => facilities.ccn, { onDelete: 'cascade' }),
    creatorEmail: text('creator_email').notNull(),
    persona: text('persona').notNull(),
    contactName: text('contact_name'),
    contactTitle: text('contact_title'),
    adminNotes: text('admin_notes'),
    selectedFactsJson: text('selected_facts_json').notNull(),
    campaignJson: text('campaign_json').notNull(),
    model: text('model').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('outreach_campaigns_ccn_time_idx').on(table.ccn, table.createdAt)],
);
