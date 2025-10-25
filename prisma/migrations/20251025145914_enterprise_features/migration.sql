/*
  Warnings:

  - You are about to drop the column `vehicle` on the `Driver` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vehicleId]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DRIVER_LICENSE', 'INSURANCE', 'REGISTRATION', 'INSPECTION', 'BACKGROUND_CHECK');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Driver" DROP COLUMN "vehicle",
ADD COLUMN     "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "insuranceExpiry" TIMESTAMP(3),
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "licenseExpiry" TIMESTAMP(3),
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "totalRides" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vehicleId" TEXT;

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverDocument" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_vehicleId_key" ON "Driver"("vehicleId");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
