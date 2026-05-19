-- CreateEnum
CREATE TYPE "PointTxType" AS ENUM ('CP_EARN', 'CP_SPEND', 'XP_EARN', 'XP_SPEND');

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" TEXT NOT NULL,
    "type" "PointTxType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "point_transactions_user_id_idx" ON "point_transactions"("user_id");

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
