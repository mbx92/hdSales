-- Link restricted staff accounts to the owner whose operational data they use.
ALTER TABLE "users" ADD COLUMN "accountOwnerId" TEXT;

CREATE INDEX "users_accountOwnerId_idx" ON "users"("accountOwnerId");

ALTER TABLE "users"
ADD CONSTRAINT "users_accountOwnerId_fkey"
FOREIGN KEY ("accountOwnerId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
