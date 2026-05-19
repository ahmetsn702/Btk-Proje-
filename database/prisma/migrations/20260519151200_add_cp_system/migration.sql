-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "bonus_threshold" SET DEFAULT 1000;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "max_cp_discount" INTEGER NOT NULL DEFAULT 0;
