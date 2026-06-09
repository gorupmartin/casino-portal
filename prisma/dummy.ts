import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    // Guard: don't duplicate if dummy data is already present
    const existing = await prisma.location.count();
    if (existing > 0) {
        console.log(`Dummy data already present (${existing} locations). Skipping.`);
        return;
    }

    console.log("Inserting dummy data...");

    // --- Keys module: dictionaries ---
    const [klub, partner, kladionica] = await Promise.all([
        prisma.locationType.create({ data: { name: "Klub" } }),
        prisma.locationType.create({ data: { name: "Partner" } }),
        prisma.locationType.create({ data: { name: "Kladionica" } }),
    ]);

    const keyTypes = await Promise.all(
        ["Bankomat", "Operater", "Servis", "Glavni"].map((name) =>
            prisma.keyType.create({ data: { name } })
        )
    );

    const positions = await Promise.all(
        ["Pozicija 1", "Pozicija 2", "Ladica A", "Ladica B"].map((name) =>
            prisma.cabinetPosition.create({ data: { name } })
        )
    );

    // --- Locations ---
    const locations = await Promise.all([
        prisma.location.create({ data: { name: "Casino Zagreb Centar", status: "OPEN", locationTypeId: klub.id } }),
        prisma.location.create({ data: { name: "Casino Split Riva", status: "OPEN", locationTypeId: klub.id } }),
        prisma.location.create({ data: { name: "Partner Lokal Rijeka", status: "OPEN", locationTypeId: partner.id } }),
        prisma.location.create({ data: { name: "Kladionica Osijek Trg", status: "CLOSED", locationTypeId: kladionica.id } }),
        prisma.location.create({ data: { name: "Casino Dubrovnik Lapad", status: "OPEN", locationTypeId: klub.id } }),
    ]);

    // --- Keys ---
    const keys = await Promise.all([
        prisma.key.create({ data: { keyCode: "KEY-001", silverCount: 5, goldCount: 2 } }),
        prisma.key.create({ data: { keyCode: "KEY-002", silverCount: 3, goldCount: 1, brokenSilver: 1 } }),
        prisma.key.create({ data: { keyCode: "KEY-003", silverCount: 8, goldCount: 0 } }),
        prisma.key.create({ data: { keyCode: "KEY-004", silverCount: 2, goldCount: 4, brokenGold: 1 } }),
        prisma.key.create({ data: { keyCode: "KEY-005", silverCount: 6, goldCount: 3 } }),
        prisma.key.create({ data: { keyCode: "KEY-006", silverCount: 1, goldCount: 1 } }),
    ]);

    // --- Key assignments ---
    await Promise.all([
        prisma.keyAssignment.create({ data: { keyId: keys[0].id, locationId: locations[0].id, cabinetPositionId: positions[0].id, keyTypeId: keyTypes[0].id } }),
        prisma.keyAssignment.create({ data: { keyId: keys[1].id, locationId: locations[0].id, cabinetPositionId: positions[1].id, keyTypeId: keyTypes[1].id } }),
        prisma.keyAssignment.create({ data: { keyId: keys[2].id, locationId: locations[1].id, cabinetPositionId: positions[0].id, keyTypeId: keyTypes[3].id } }),
        prisma.keyAssignment.create({ data: { keyId: keys[3].id, locationId: locations[2].id, cabinetPositionId: positions[2].id, keyTypeId: keyTypes[2].id } }),
        prisma.keyAssignment.create({ data: { keyId: keys[4].id, locationId: locations[4].id, cabinetPositionId: positions[3].id, keyTypeId: keyTypes[0].id } }),
    ]);

    // --- Certificates module: dictionaries ---
    const games = await Promise.all([
        prisma.gameDefinition.create({ data: { name: "Book of Ra Deluxe", version: "6", renoId: "RENO-1001" } }),
        prisma.gameDefinition.create({ data: { name: "Sizzling Hot", version: "2", renoId: "RENO-1002" } }),
        prisma.gameDefinition.create({ data: { name: "Lucky Lady's Charm", version: "1", renoId: "RENO-1003" } }),
        prisma.gameDefinition.create({ data: { name: "Mega Joker", version: "3", renoId: "RENO-1004" } }),
    ]);

    const boards = await Promise.all([
        prisma.boardDefinition.create({ data: { name: "Novomatic Coolfire 2", biosName: "CF2-BIOS-1.4" } }),
        prisma.boardDefinition.create({ data: { name: "IGT AVP 3.0", biosName: "AVP-BIOS-2.1" } }),
        prisma.boardDefinition.create({ data: { name: "EGT P24", biosName: "P24-BIOS-1.0" } }),
    ]);

    const cabinets = await Promise.all([
        prisma.cabinetDefinition.create({ data: { name: "Novostar V.I.P. Lounge", drawerType: "Standard" } }),
        prisma.cabinetDefinition.create({ data: { name: "Premium V", drawerType: "Široka" } }),
        prisma.cabinetDefinition.create({ data: { name: "G2 Upright", drawerType: "Standard" } }),
    ]);

    const controllers = await Promise.all([
        prisma.controllerDefinition.create({ data: { name: "SAS Controller", version: "6.02" } }),
        prisma.controllerDefinition.create({ data: { name: "Quixant QXi", version: "1.3" } }),
    ]);

    // --- Certificates ---
    const cert1 = await prisma.certificateDefinition.create({
        data: { name: "Class III - 2024/01", recognizedHr: true, forSlovenia: false, gameId: games[0].id, boardId: boards[0].id },
    });
    const cert2 = await prisma.certificateDefinition.create({
        data: { name: "Class III - 2024/02", recognizedHr: true, forSlovenia: true, gameId: games[1].id, boardId: boards[2].id },
    });
    const cert3 = await prisma.certificateDefinition.create({
        data: { name: "Class II - 2023/15", recognizedHr: false, forSlovenia: false, gameId: games[2].id, boardId: boards[1].id },
    });

    await Promise.all([
        prisma.certificateCabinet.create({ data: { certificateId: cert1.id, cabinetId: cabinets[0].id } }),
        prisma.certificateCabinet.create({ data: { certificateId: cert1.id, cabinetId: cabinets[1].id } }),
        prisma.certificateCabinet.create({ data: { certificateId: cert2.id, cabinetId: cabinets[2].id } }),
        prisma.certificateCabinet.create({ data: { certificateId: cert3.id, cabinetId: cabinets[0].id } }),
    ]);

    // --- Jackpot configs ---
    await Promise.all([
        prisma.jackpotConfig.create({ data: { gameId: games[0].id, controllerId: controllers[0].id, initialGrand: 10000, initialMajor: 1000, minBet: 0.2, maxBet: 100 } }),
        prisma.jackpotConfig.create({ data: { gameId: games[3].id, controllerId: controllers[1].id, initialGrand: 25000, initialMajor: 2500, minBet: 0.5, maxBet: 200 } }),
    ]);

    // --- Working hours: technicians ---
    const techs = await Promise.all([
        prisma.technician.create({ data: { firstName: "Ivan", lastName: "Horvat" } }),
        prisma.technician.create({ data: { firstName: "Marko", lastName: "Kovačević" } }),
        prisma.technician.create({ data: { firstName: "Ana", lastName: "Babić" } }),
    ]);

    await Promise.all([
        prisma.initialHours.create({ data: { technicianId: techs[0].id, hours: 12.5 } }),
        prisma.initialHours.create({ data: { technicianId: techs[1].id, hours: 0 } }),
        prisma.initialHours.create({ data: { technicianId: techs[2].id, hours: 4 } }),
    ]);

    // --- Work logs (current month) ---
    const y = new Date().getFullYear();
    const m = new Date().getMonth(); // 0-based
    const d = (day: number) => new Date(y, m, day);

    await Promise.all([
        prisma.workLog.create({ data: { technicianId: techs[0].id, date: d(2), startTime: "08:00", endTime: "17:00", notes: "Servis aparata Zagreb" } }),
        prisma.workLog.create({ data: { technicianId: techs[0].id, date: d(3), startTime: "08:00", endTime: "16:00", notes: "Redovna kontrola" } }),
        prisma.workLog.create({ data: { technicianId: techs[1].id, date: d(2), startTime: "09:00", endTime: "19:30", notes: "Hitna intervencija Split" } }),
        prisma.workLog.create({ data: { technicianId: techs[1].id, date: d(4), manualOvertime: 3.5, notes: "Vikend dežurstvo (ručni unos)" } }),
        prisma.workLog.create({ data: { technicianId: techs[2].id, date: d(3), startTime: "07:30", endTime: "15:30", notes: "Instalacija nove igre" } }),
    ]);

    // --- Extra user with limited permissions ---
    const bcrypt = await import("bcryptjs");
    const hashed = await bcrypt.hash("viewer123", 10);
    const viewer = await prisma.user.create({
        data: { username: "pregled", password: hashed, role: "USER", isActive: true },
    });
    await Promise.all([
        prisma.userPermission.create({ data: { userId: viewer.id, module: "keys", canView: true, canWrite: false } }),
        prisma.userPermission.create({ data: { userId: viewer.id, module: "certificates", canView: true, canWrite: false } }),
        prisma.userPermission.create({ data: { userId: viewer.id, module: "workhours", canView: true, canWrite: true } }),
    ]);

    console.log("Dummy data inserted:");
    console.log(`- ${locations.length} locations, ${keys.length} keys, 5 assignments`);
    console.log(`- ${games.length} games, 3 certificates, 2 jackpot configs`);
    console.log(`- ${techs.length} technicians, 5 work logs`);
    console.log(`- extra user: pregled / viewer123 (limited permissions)`);
}

main()
    .then(async () => { await prisma.$disconnect(); })
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
