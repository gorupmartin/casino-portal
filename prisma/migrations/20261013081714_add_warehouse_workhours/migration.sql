-- CreateTable
CREATE TABLE "WarehouseWorker" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "WarehouseInitialHours" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workerId" INTEGER NOT NULL,
    "hours" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "WarehouseInitialHours_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WarehouseWorker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarehouseWorkLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workerId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "manualOvertime" DECIMAL,
    "notes" TEXT,
    CONSTRAINT "WarehouseWorkLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WarehouseWorker" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseInitialHours_workerId_key" ON "WarehouseInitialHours"("workerId");
