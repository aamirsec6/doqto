-- Oncology v1: department scope, unit kinds, per-layout ops, staff PIN, board revision

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "department" TEXT NOT NULL DEFAULT 'oncology';

ALTER TABLE "WardLayout" ADD COLUMN IF NOT EXISTS "unitKind" TEXT NOT NULL DEFAULT 'ward';
ALTER TABLE "WardLayout" ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Bed" ADD COLUMN IF NOT EXISTS "layoutId" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "layoutId" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "pinHash" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "layoutId" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "layoutId" TEXT;

CREATE INDEX IF NOT EXISTS "Bed_layoutId_idx" ON "Bed"("layoutId");
CREATE INDEX IF NOT EXISTS "StaffMember_layoutId_idx" ON "StaffMember"("layoutId");
CREATE INDEX IF NOT EXISTS "Asset_layoutId_idx" ON "Asset"("layoutId");
CREATE INDEX IF NOT EXISTS "Alert_layoutId_idx" ON "Alert"("layoutId");
