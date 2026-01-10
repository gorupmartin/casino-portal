import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // Clear existing data
    await prisma.certificateCabinet.deleteMany();
    await prisma.certificateDefinition.deleteMany();
    await prisma.jackpotConfig.deleteMany();
    await prisma.gameDefinition.deleteMany();
    await prisma.boardDefinition.deleteMany();
    await prisma.cabinetDefinition.deleteMany();
    await prisma.controllerDefinition.deleteMany();
    await prisma.userPermission.deleteMany();
    await prisma.user.deleteMany();

    // Users - hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
        data: { username: "admin", password: hashedPassword, role: "ADMIN", isActive: true }
    });
    console.log("- Users created");

    // Boards
    const b1 = await prisma.boardDefinition.create({ data: { name: "Coolfire 1", biosName: "CF1-v2" } });
    const b2 = await prisma.boardDefinition.create({ data: { name: "Impera Link", biosName: "IL-v5" } });
    const b3 = await prisma.boardDefinition.create({ data: { name: "NovoLine", biosName: "NL-v1", isActive: false } }); // Blocked
    console.log("- Boards created");

    // Cabinets
    const c1 = await prisma.cabinetDefinition.create({ data: { name: "FV680", drawerType: "Type A" } });
    const c2 = await prisma.cabinetDefinition.create({ data: { name: "FV880", drawerType: "Type B" } });
    const c3 = await prisma.cabinetDefinition.create({ data: { name: "V.I.P. Lounge", drawerType: "Premium" } });
    const c4 = await prisma.cabinetDefinition.create({ data: { name: "Old Cabinet", drawerType: "N/A", isActive: false } }); // Blocked
    console.log("- Cabinets created");

    // Games
    const g1 = await prisma.gameDefinition.create({ data: { name: "Book of Ra", version: "6.2", renoId: "R-101" } });
    const g2 = await prisma.gameDefinition.create({ data: { name: "Lucky Lady's Charm", version: "4.5", renoId: "R-102" } });
    const g3 = await prisma.gameDefinition.create({ data: { name: "Sizzling Hot", version: "1.0", renoId: "R-888", isActive: false } }); // Blocked
    console.log("- Games created");

    // Controllers
    const ctrl1 = await prisma.controllerDefinition.create({ data: { name: "Arduino Mega", version: "1.0" } });
    const ctrl2 = await prisma.controllerDefinition.create({ data: { name: "Raspberry Ti", version: "3B" } });
    console.log("- Controllers created");

    // Jackpots
    await prisma.jackpotConfig.create({
        data: {
            gameId: g1.id,
            controllerId: ctrl1.id,
            initialGrand: 10000,
            initialMajor: 5000,
            minBet: 10,
            maxBet: 500
        }
    });
    console.log("- Jackpots created");

    // Certificates
    // Cert 1: Book of Ra + Coolfire 1 + FV680
    await prisma.certificateDefinition.create({
        data: {
            name: "HR-2024-001",
            recognizedHr: true,
            forSlovenia: false,
            filePath: "C:/Certs/br_cf1.pdf",
            gameId: g1.id,
            boardId: b1.id,
            cabinets: {
                create: [
                    { cabinetId: c1.id }
                ]
            }
        }
    });

    // Cert 2: Lucky Lady + Impera Link + FV880 & VIP Lounge (Multi-cabinet)
    await prisma.certificateDefinition.create({
        data: {
            name: "HR-2024-002",
            recognizedHr: true,
            forSlovenia: true,
            filePath: "C:/Certs/ll_im.pdf",
            gameId: g2.id,
            boardId: b2.id,
            cabinets: {
                create: [
                    { cabinetId: c2.id },
                    { cabinetId: c3.id }
                ]
            }
        }
    });

    // Keys Module Seeding

    // Clear existing keys data
    await prisma.keyAssignment.deleteMany();
    await prisma.key.deleteMany();
    await prisma.location.deleteMany();
    await prisma.keyType.deleteMany();
    await prisma.cabinetPosition.deleteMany();
    await prisma.locationType.deleteMany();

    // 1. Dictionaries
    const lt1 = await prisma.locationType.create({ data: { name: "Klub" } });
    const lt2 = await prisma.locationType.create({ data: { name: "Partner" } });
    const lt3 = await prisma.locationType.create({ data: { name: "Kladionica" } });
    console.log("- LocationTypes created");

    const cp1 = await prisma.cabinetPosition.create({ data: { name: "Pozicija 1" } });
    const cp2 = await prisma.cabinetPosition.create({ data: { name: "Pozicija 2" } });
    const cp3 = await prisma.cabinetPosition.create({ data: { name: "Ladica" } });
    const cp4 = await prisma.cabinetPosition.create({ data: { name: "Sef" } });
    console.log("- CabinetPositions created");

    const kt1 = await prisma.keyType.create({ data: { name: "Bankomat" } });
    const kt2 = await prisma.keyType.create({ data: { name: "Operater" } });
    const kt3 = await prisma.keyType.create({ data: { name: "Attendant" } });
    const kt4 = await prisma.keyType.create({ data: { name: "Servis" } });
    console.log("- KeyTypes created");

    // 2. Locations
    const loc1 = await prisma.location.create({ data: { name: "Zagreb 1", locationTypeId: lt1.id } });
    const loc2 = await prisma.location.create({ data: { name: "Split Center", locationTypeId: lt2.id } });
    const loc3 = await prisma.location.create({ data: { name: "Rijeka (Zatvoreno)", status: "CLOSED", locationTypeId: lt1.id } });
    console.log("- Locations created");

    // 3. Keys
    const k1 = await prisma.key.create({
        data: {
            keyCode: "KEY-ZG-001",
            silverCount: 10,
            goldCount: 5,
            brokenSilver: 0,
            brokenGold: 0
        }
    });
    const k2 = await prisma.key.create({
        data: {
            keyCode: "KEY-ST-055",
            silverCount: 2,
            goldCount: 1,
            brokenSilver: 1,
            brokenGold: 0
        }
    });
    const k3 = await prisma.key.create({
        data: {
            keyCode: "KEY-UNASSIGNED",
            silverCount: 50,
            goldCount: 20
        }
    });
    console.log("- Keys created");

    // 4. Assignments
    // Key 1 -> Zagreb 1 -> Pozicija 1 -> Bankomat
    await prisma.keyAssignment.create({
        data: {
            keyId: k1.id,
            locationId: loc1.id,
            cabinetPositionId: cp1.id,
            keyTypeId: kt1.id
        }
    });

    // Key 2 -> Split -> Ladica -> Operater
    await prisma.keyAssignment.create({
        data: {
            keyId: k2.id,
            locationId: loc2.id,
            cabinetPositionId: cp3.id,
            keyTypeId: kt2.id
        }
    });

    console.log("- KeyAssignments created");

    // Working Hours Module Seeding

    // Clear existing working hours data
    await prisma.workLog.deleteMany();
    await prisma.initialHours.deleteMany();
    await prisma.technician.deleteMany();

    // Technicians
    const tech1 = await prisma.technician.create({ data: { firstName: "Marko", lastName: "Horvat" } });
    const tech2 = await prisma.technician.create({ data: { firstName: "Ivan", lastName: "Kovač" } });
    const tech3 = await prisma.technician.create({ data: { firstName: "Josip", lastName: "Novak", isActive: false } }); // Blocked
    console.log("- Technicians created");

    // Initial Hours
    await prisma.initialHours.create({ data: { technicianId: tech1.id, hours: 10 } });
    await prisma.initialHours.create({ data: { technicianId: tech2.id, hours: -5 } }); // Negative balance
    console.log("- Initial Hours created");

    // Work Logs
    await prisma.workLog.create({
        data: {
            technicianId: tech1.id,
            date: new Date("2024-12-20"),
            startTime: "08:00",
            endTime: "16:00", // 8h - normal day
            notes: "Normalan radni dan"
        }
    });
    await prisma.workLog.create({
        data: {
            technicianId: tech1.id,
            date: new Date("2024-12-21"),
            startTime: "07:00",
            endTime: "18:00", // 11h - 3h overtime
            notes: "Hitna intervencija"
        }
    });
    await prisma.workLog.create({
        data: {
            technicianId: tech2.id,
            date: new Date("2024-12-20"),
            startTime: "09:00",
            endTime: "15:00", // 6h - 2h undertime
            notes: "Kraći dan"
        }
    });
    console.log("- Work Logs created");

    console.log("Seeding complete!");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
