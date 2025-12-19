-- =====================================================
-- Migration Script: Add missing userId columns
-- Run this to preserve existing data before schema sync
-- =====================================================

-- Step 1: Add userId column to motorcycles (if not exists)
ALTER TABLE "motorcycles" 
ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Step 2: Update existing motorcycles with the provided userId
UPDATE "motorcycles" 
SET "userId" = 'cmj81gbkt000057xczkrji052' 
WHERE "userId" IS NULL;

-- Step 3: Make userId NOT NULL after data is populated
ALTER TABLE "motorcycles" 
ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: Add foreign key constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'motorcycles_userId_fkey'
    ) THEN
        ALTER TABLE "motorcycles" 
        ADD CONSTRAINT "motorcycles_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Step 5: Create index for userId (if not exists)
CREATE INDEX IF NOT EXISTS "motorcycles_userId_idx" ON "motorcycles"("userId");

-- Step 6: Add unique constraint for userId + vin (if not exists)  
-- First drop the old unique constraint on vin only if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'motorcycles_vin_key'
    ) THEN
        ALTER TABLE "motorcycles" DROP CONSTRAINT "motorcycles_vin_key";
    END IF;
END $$;

-- Add new unique constraint on userId + vin
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'motorcycles_userId_vin_key'
    ) THEN
        ALTER TABLE "motorcycles" 
        ADD CONSTRAINT "motorcycles_userId_vin_key" 
        UNIQUE ("userId", "vin");
    END IF;
END $$;
