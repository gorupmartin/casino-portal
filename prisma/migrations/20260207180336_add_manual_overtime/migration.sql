-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "id", "isActive", "password", "role", "username") SELECT "createdAt", "id", "isActive", "password", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE TABLE "new_WorkLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "manualOvertime" DECIMAL,
    "notes" TEXT,
    CONSTRAINT "WorkLog_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorkLog" ("date", "endTime", "id", "notes", "startTime", "technicianId") SELECT "date", "endTime", "id", "notes", "startTime", "technicianId" FROM "WorkLog";
DROP TABLE "WorkLog";
ALTER TABLE "new_WorkLog" RENAME TO "WorkLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
