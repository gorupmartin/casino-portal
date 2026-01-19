import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // Clear all existing data
    await prisma.certificateCabinet.deleteMany();
    await prisma.certificateDefinition.deleteMany();
    await prisma.jackpotConfig.deleteMany();
    await prisma.gameDefinition.deleteMany();
    await prisma.boardDefinition.deleteMany();
    await prisma.cabinetDefinition.deleteMany();
    await prisma.controllerDefinition.deleteMany();
    await prisma.keyAssignment.deleteMany();
    await prisma.key.deleteMany();
    await prisma.location.deleteMany();
    await prisma.keyType.deleteMany();
    await prisma.cabinetPosition.deleteMany();
    await prisma.locationType.deleteMany();
    await prisma.workLog.deleteMany();
    await prisma.initialHours.deleteMany();
    await prisma.technician.deleteMany();
    await prisma.userPermission.deleteMany();
    await prisma.user.deleteMany();

    console.log("- Cleared all existing data");

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
        data: {
            username: "admin",
            password: hashedPassword,
            role: "ADMIN",
            isActive: true
        }
    });
    console.log("- Admin user created (username: admin, password: admin123)");

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
