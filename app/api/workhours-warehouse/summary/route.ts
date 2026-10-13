import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Prevent caching in production
export const dynamic = 'force-dynamic';

// Helper: Calculate hours worked from start/end time
function calculateHoursWorked(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const workedMinutes = endMinutes - startMinutes;
    return workedMinutes / 60; // Return hours
}

// GET: Calculate summary for all active warehouse workers
export async function GET(request: Request) {
    try {
        // Get all active workers with their initial hours and work logs
        const workers = await prisma.warehouseWorker.findMany({
            where: { isActive: true },
            include: {
                initialHours: true,
                workLogs: true
            },
            orderBy: { lastName: "asc" }
        });

        const summary = workers.map(worker => {
            const initialHours = worker.initialHours?.hours
                ? Number(worker.initialHours.hours)
                : 0;

            // Calculate total hours from work logs
            let totalWorkedHours = 0;
            let totalOvertimeHours = 0;

            worker.workLogs.forEach(log => {
                // If manualOvertime is set, use it directly
                if (log.manualOvertime !== null && log.manualOvertime !== undefined) {
                    totalOvertimeHours += Number(log.manualOvertime);
                } else if (log.startTime && log.endTime) {
                    // Otherwise calculate from start/end time
                    const workedHours = calculateHoursWorked(log.startTime, log.endTime);
                    totalWorkedHours += workedHours;
                    totalOvertimeHours += (workedHours - 8); // Overtime = worked - 8
                }
            });

            return {
                id: worker.id,
                firstName: worker.firstName,
                lastName: worker.lastName,
                initialHours,
                totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
                totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
                totalBalance: Math.round((initialHours + totalOvertimeHours) * 100) / 100,
                logCount: worker.workLogs.length
            };
        });

        // Sort by balance from highest to lowest
        summary.sort((a, b) => b.totalBalance - a.totalBalance);

        return NextResponse.json(summary);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to calculate summary" }, { status: 500 });
    }
}
