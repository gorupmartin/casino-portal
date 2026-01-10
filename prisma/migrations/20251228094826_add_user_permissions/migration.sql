-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "module" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CabinetPosition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "KeyType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Location" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "locationTypeId" INTEGER NOT NULL,
    CONSTRAINT "Location_locationTypeId_fkey" FOREIGN KEY ("locationTypeId") REFERENCES "LocationType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Key" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyCode" TEXT NOT NULL,
    "silverCount" INTEGER NOT NULL DEFAULT 0,
    "goldCount" INTEGER NOT NULL DEFAULT 0,
    "brokenSilver" INTEGER NOT NULL DEFAULT 0,
    "brokenGold" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "KeyAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keyId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "cabinetPositionId" INTEGER NOT NULL,
    "keyTypeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeyAssignment_keyId_fkey" FOREIGN KEY ("keyId") REFERENCES "Key" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KeyAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KeyAssignment_cabinetPositionId_fkey" FOREIGN KEY ("cabinetPositionId") REFERENCES "CabinetPosition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KeyAssignment_keyTypeId_fkey" FOREIGN KEY ("keyTypeId") REFERENCES "KeyType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CertificateDefinition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "recognizedHr" BOOLEAN NOT NULL DEFAULT true,
    "forSlovenia" BOOLEAN NOT NULL DEFAULT false,
    "filePath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "gameId" INTEGER NOT NULL,
    "boardId" INTEGER NOT NULL,
    CONSTRAINT "CertificateDefinition_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CertificateDefinition_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "BoardDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoardDefinition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "biosName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CabinetDefinition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "drawerType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "GameDefinition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "renoId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ControllerDefinition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "JackpotConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "controllerId" INTEGER NOT NULL,
    "initialGrand" DECIMAL,
    "initialMajor" DECIMAL,
    "minBet" DECIMAL,
    "maxBet" DECIMAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "JackpotConfig_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JackpotConfig_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "ControllerDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CertificateCabinet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "certificateId" INTEGER NOT NULL,
    "cabinetId" INTEGER NOT NULL,
    CONSTRAINT "CertificateCabinet_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "CertificateDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CertificateCabinet_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "CabinetDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Technician" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "InitialHours" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "hours" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "InitialHours_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technicianId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "WorkLog_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_module_key" ON "UserPermission"("userId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "LocationType_name_key" ON "LocationType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CabinetPosition_name_key" ON "CabinetPosition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "KeyType_name_key" ON "KeyType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Key_keyCode_key" ON "Key"("keyCode");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateDefinition_name_key" ON "CertificateDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BoardDefinition_name_key" ON "BoardDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CabinetDefinition_name_key" ON "CabinetDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GameDefinition_name_version_key" ON "GameDefinition"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ControllerDefinition_name_version_key" ON "ControllerDefinition"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateCabinet_certificateId_cabinetId_key" ON "CertificateCabinet"("certificateId", "cabinetId");

-- CreateIndex
CREATE UNIQUE INDEX "InitialHours_technicianId_key" ON "InitialHours"("technicianId");
