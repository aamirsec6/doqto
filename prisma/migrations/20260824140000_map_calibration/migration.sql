-- AlterTable
ALTER TABLE "WardLayout" ADD COLUMN "calibrationJson" JSONB;
ALTER TABLE "WardLayout" ADD COLUMN "mapVersion" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN "parentKey" TEXT;
ALTER TABLE "Room" ADD COLUMN "verticesJson" JSONB;
