/*
  Warnings:

  - You are about to drop the column `isActive` on the `MenuItem` table. All the data in the column will be lost.
  - You are about to drop the column `lat` on the `Restaurant` table. All the data in the column will be lost.
  - You are about to drop the column `lng` on the `Restaurant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MenuItem" DROP COLUMN "isActive";

-- AlterTable
ALTER TABLE "Restaurant" DROP COLUMN "lat",
DROP COLUMN "lng";
