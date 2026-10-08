-- Workspace profile fields are nullable so existing settings rows are preserved.
ALTER TYPE "activity_event_type" ADD VALUE 'SETTINGS_UPDATED';

ALTER TABLE "workspace_settings"
  ADD COLUMN "website" VARCHAR(2048),
  ADD COLUMN "industry" VARCHAR(80),
  ADD COLUMN "company_size" VARCHAR(20),
  ADD COLUMN "timezone" VARCHAR(100),
  ADD COLUMN "response_expectation" VARCHAR(40);
