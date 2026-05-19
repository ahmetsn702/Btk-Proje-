-- AlterTable
ALTER TABLE "point_transactions" ADD COLUMN     "category_id" TEXT;

-- CreateIndex
CREATE INDEX "point_transactions_category_id_idx" ON "point_transactions"("category_id");

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
