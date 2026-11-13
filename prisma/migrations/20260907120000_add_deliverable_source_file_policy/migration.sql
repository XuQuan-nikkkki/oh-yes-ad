CREATE TYPE "SourceFilePolicy" AS ENUM ('REQUIRED', 'OPTIONAL');
ALTER TABLE "Deliverable" ADD COLUMN "sourceFilePolicy" "SourceFilePolicy" NOT NULL DEFAULT 'OPTIONAL';
UPDATE "Deliverable" SET "sourceFilePolicy" = 'REQUIRED' WHERE "type" = 'DESIGN';
