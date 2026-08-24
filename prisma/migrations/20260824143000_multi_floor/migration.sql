-- Multi-floor: Floor model + WardLayout per floor/unit (not 1:1 tenant)

CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "building" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Floor_tenantId_idx" ON "Floor"("tenantId");

ALTER TABLE "Floor" ADD CONSTRAINT "Floor_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WardLayout: drop 1:1 tenant constraint, link to floor
ALTER TABLE "WardLayout" DROP CONSTRAINT IF EXISTS "WardLayout_tenantId_key";
ALTER TABLE "WardLayout" ADD COLUMN "floorId" TEXT;

-- Room: scope to layout
ALTER TABLE "Room" ADD COLUMN "layoutId" TEXT;

-- Drop old room rows (fresh start after tenant wipe)
DELETE FROM "Room";
DELETE FROM "WardLayout";

ALTER TABLE "WardLayout" ALTER COLUMN "floorId" SET NOT NULL;

CREATE UNIQUE INDEX "WardLayout_floorId_wardName_key" ON "WardLayout"("floorId", "wardName");
CREATE INDEX "WardLayout_tenantId_idx" ON "WardLayout"("tenantId");
CREATE INDEX "WardLayout_floorId_idx" ON "WardLayout"("floorId");

ALTER TABLE "WardLayout" ADD CONSTRAINT "WardLayout_floorId_fkey"
    FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS "Room_tenantId_key_key";
DROP INDEX IF EXISTS "Room_tenantId_key_key";

ALTER TABLE "Room" ALTER COLUMN "layoutId" SET NOT NULL;

CREATE UNIQUE INDEX "Room_layoutId_key_key" ON "Room"("layoutId", "key");
CREATE INDEX "Room_layoutId_idx" ON "Room"("layoutId");

ALTER TABLE "Room" ADD CONSTRAINT "Room_layoutId_fkey"
    FOREIGN KEY ("layoutId") REFERENCES "WardLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
