-- Drop legacy 1:1 tenant unique indexes left from init migration.
-- multi_floor used DROP CONSTRAINT but init created UNIQUE INDEXes.
DROP INDEX IF EXISTS "WardLayout_tenantId_key";
DROP INDEX IF EXISTS "Room_tenantId_key_key";
