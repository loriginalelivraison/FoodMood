-- CreateEnum
CREATE TYPE "Category" AS ENUM ('PIZZA', 'BURGER', 'JAPONAIS', 'PATISSERIE', 'AUTRE');

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "category" "Category" NOT NULL DEFAULT 'AUTRE',
ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT true;
