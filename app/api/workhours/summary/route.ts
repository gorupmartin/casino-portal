import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper: Calculate hours worked from start/end time
function calculateHoursWorked(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const workedMinutes = endMinutes - startMinutes;
    return workedMinutes / 60; // Return hours
}

// GET: Calculate summary for all active technicians
export async function GET(request: Request) {
    try {
        // Get all active technicians with their initial hours and work logs
        const technicians = await prisma.technician.findMany({
            where: { isActive: true },
            include: {
                initialHours: true,
                workLogs: true
            },
            orderBy: { lastName: "asc" }
        });

        const summary = technicians.map(tech => {
            const initialHours = tech.initialHours?.hours
                ? Number(tech.initialHours.hours)
                : 0;

            // Calculate total hours from work logs
            let totalWorkedHours = 0;
            let totalOvertimeHours = 0;

            tech.workLogs.forEach(log => {
                const workedHours = calculateHoursWorked(log.startTime, log.endTime);
                totalWorkedHours += workedHours;
                totalOvertimeHours += (workedHours - 8); // Overtime = worked - 8
            });

            return {
                id: tech.id,
                firstName: tech.firstName,
                lastName: tech.lastName,
                initialHours,
                totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
                totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
                totalBalance: Math.round((initialHours + totalOvertimeHours) * 100) / 100,
                logCount: tech.workLogs.length
            };
        });

        return NextResponse.json(summary);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to calculate summary" }, { status: 500 });
    }
}
