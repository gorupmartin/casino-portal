"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import Link from "next/link";

type TabType = "summary" | "logs" | "dictionaries";

interface Permission {
    module: string;
    canView: boolean;
    canWrite: boolean;
}

export default function WorkHoursPage() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [permissions, setPermissions] = useState<Permission[]>([]);

    // @ts-ignore
    const isAdmin = session?.user?.role === "ADMIN";

    const [activeTab, setActiveTab] = useState<TabType>("summary");
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [workLogs, setWorkLogs] = useState<any[]>([]);
    const [summary, setSummary] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Log Form
    const [logForm, setLogForm] = useState({ technicianId: "", date: "", startTime: "", endTime: "", notes: "" });
    const [logModalOpen, setLogModalOpen] = useState(false);

    // Fetch permissions for non-admin users
    useEffect(() => {
        const fetchPermissions = async () => {
            if (status === "authenticated" && !isAdmin) {
                try {
                    const res = await fetch("/api/user/permissions");
                    if (res.ok) {
                        const data = await res.json();
                        setPermissions(data.permissions || []);
                    }
                } catch (error) {
                    console.error("Error fetching permissions:", error);
                }
            }
        };

        if (status !== "loading") {
            fetchPermissions();
        }
    }, [status, isAdmin]);

    const canWrite = () => {
        if (isAdmin) return true;
        const perm = permissions.find(p => p.module === "workhours");
        return perm?.canWrite || false;
    };

    const canView = () => {
        if (isAdmin) return true;
        const perm = permissions.find(p => p.module === "workhours");
        return perm?.canView || false;
    };

    // Read tab from URL
    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab === "logs" || tab === "summary" || tab === "dictionaries") {
            // If user doesn't have write permission, force summary tab
            if (!canWrite() && (tab === "logs" || tab === "dictionaries")) {
                router.replace("/workhours?tab=summary");
                setActiveTab("summary");
            } else {
                setActiveTab(tab);
            }
        }
    }, [searchParams, permissions, isAdmin]);

    // Fetch data
    const fetchTechnicians = async () => {
        const res = await fetch("/api/workhours/technicians");
        if (res.ok) setTechnicians(await res.json());
    };

    const fetchLogs = async () => {
        const res = await fetch("/api/workhours/logs");
        if (res.ok) setWorkLogs(await res.json());
    };

    const fetchSummary = async () => {
        const res = await fetch("/api/workhours/summary");
        if (res.ok) setSummary(await res.json());
    };

    useEffect(() => {
        setLoading(true);
        fetchTechnicians();
        fetchLogs();
        fetchSummary();
        setLoading(false);
    }, []);

    // Calculate overtime (client-side for display)
    const calculateOvertime = (start: string, end: string) => {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const worked = (eh * 60 + em - sh * 60 - sm) / 60;
        return Math.round((worked - 8) * 100) / 100;
    };

    // Auto-format date: 22122025 → 22/12/2025
    const formatDateInput = (value: string) => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');

        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    };

    // Auto-format time: 1000 → 10:00
    const formatTimeInput = (value: string) => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');

        if (digits.length <= 2) return digits;
        return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
    };

    const activeTechs = technicians.filter(t => t.isActive);

    const handleAddLog = async (e: React.FormEvent) => {
        e.preventDefault();

        // Convert dd/mm/yyyy to yyyy-mm-dd for API
        const dateParts = logForm.date.split('/');
        const apiDate = dateParts.length === 3
            ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
            : logForm.date;

        const res = await fetch("/api/workhours/logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...logForm,
                date: apiDate
            })
        });
        if (res.ok) {
            setLogModalOpen(false);
            setLogForm({ technicianId: "", date: "", startTime: "", endTime: "", notes: "" });
            fetchLogs();
            fetchSummary();
        } else {
            alert("Failed to add work log");
        }
    };

    const handleDeleteLog = async (id: number) => {
        if (!confirm("Delete this entry?")) return;
        const res = await fetch(`/api/workhours/logs?id=${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchLogs();
            fetchSummary();
        }
    };

    // Filter logs by search
    const filteredLogs = workLogs.filter(log =>
        (log.technician?.firstName + " " + log.technician?.lastName).toLowerCase().includes(search.toLowerCase())
    );

    // Filter summary by search
    const filteredSummary = summary.filter(s =>
        (s.firstName + " " + s.lastName).toLowerCase().includes(search.toLowerCase())
    );

    // Loading state
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    // Access denied for users without view permission
    if (!canView()) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <p className="text-gray-500">Access denied.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-semibold leading-6 text-gray-900 dark:text-white">
                            Working Hours
                        </h1>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            Track work logs and overtime for technicians.
                        </p>
                    </div>
                    {activeTab === "logs" && canWrite() && (
                        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                            <button
                                onClick={() => setLogModalOpen(true)}
                                className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                Add Work Log
                            </button>
                        </div>
                    )}
                </div>


                {/* Search */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search by technician..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full max-w-xs rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                    />
                </div>

                {/* WORK LOGS TAB - only for users with write permission */}
                {activeTab === "logs" && canWrite() && (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr className="divide-x divide-gray-200 dark:divide-gray-700">
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Technician</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Start</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">End</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Overtime</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Notes</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {loading ? (
                                    <tr><td colSpan={7} className="py-4 text-center">Loading...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan={7} className="py-4 text-center text-gray-500">No work logs found.</td></tr>
                                ) : filteredLogs.map((log) => {
                                    const overtime = calculateOvertime(log.startTime, log.endTime);
                                    return (
                                        <tr key={log.id} className="divide-x divide-gray-200 dark:divide-gray-700">
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                                                {log.technician?.firstName} {log.technician?.lastName}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                {new Date(log.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{log.startTime}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{log.endTime}</td>
                                            <td className={`whitespace-nowrap px-3 py-4 text-sm font-bold ${overtime >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {overtime >= 0 ? '+' : ''}{overtime} h
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-[200px] truncate">
                                                {log.notes || '-'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                <button
                                                    onClick={() => handleDeleteLog(log.id)}
                                                    className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* SUMMARY TAB - visible to all users with view permission */}
                {activeTab === "summary" && (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr className="divide-x divide-gray-200 dark:divide-gray-700">
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Technician</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {loading ? (
                                    <tr><td colSpan={2} className="py-4 text-center">Loading...</td></tr>
                                ) : filteredSummary.length === 0 ? (
                                    <tr><td colSpan={2} className="py-4 text-center text-gray-500">No active technicians.</td></tr>
                                ) : filteredSummary.map((s) => (
                                    <tr key={s.id} className="divide-x divide-gray-200 dark:divide-gray-700">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                                            {s.firstName} {s.lastName}
                                        </td>
                                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-bold ${s.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {s.totalBalance >= 0 ? '+' : ''}{s.totalBalance} h
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* DICTIONARIES TAB - only for users with write permission */}
                {activeTab === "dictionaries" && canWrite() && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link
                            href="/workhours/dictionaries?tab=technicians"
                            className="group block rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-indigo-500 hover:shadow-lg transition-all bg-white dark:bg-gray-800"
                        >
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600">
                                Technicians
                                <span className="inline-block transition-transform group-hover:translate-x-1 ml-2">→</span>
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Manage technicians, add new ones, or block/unblock existing.
                            </p>
                        </Link>
                        <Link
                            href="/workhours/dictionaries?tab=initial-hours"
                            className="group block rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-indigo-500 hover:shadow-lg transition-all bg-white dark:bg-gray-800"
                        >
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600">
                                Initial Hours
                                <span className="inline-block transition-transform group-hover:translate-x-1 ml-2">→</span>
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Set initial overtime balance for each technician.
                            </p>
                        </Link>
                    </div>
                )}
            </main>

            {/* Add Work Log Modal */}
            {logModalOpen && canWrite() && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full">
                        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Add Work Log</h3>
                        <form onSubmit={handleAddLog} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Technician</label>
                                <select
                                    required
                                    value={logForm.technicianId}
                                    onChange={(e) => setLogForm({ ...logForm, technicianId: e.target.value })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm p-3 bg-white dark:bg-gray-700 dark:text-white border text-base"
                                >
                                    <option value="">Select...</option>
                                    {activeTechs.map(t => (
                                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="dd/mm/yyyy"
                                        maxLength={10}
                                        value={logForm.date}
                                        onChange={(e) => setLogForm({ ...logForm, date: formatDateInput(e.target.value) })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm p-3 bg-white dark:bg-gray-700 dark:text-white border text-base"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="HH:mm"
                                        maxLength={5}
                                        value={logForm.startTime}
                                        onChange={(e) => setLogForm({ ...logForm, startTime: formatTimeInput(e.target.value) })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm p-3 bg-white dark:bg-gray-700 dark:text-white border text-base"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="HH:mm"
                                        maxLength={5}
                                        value={logForm.endTime}
                                        onChange={(e) => setLogForm({ ...logForm, endTime: formatTimeInput(e.target.value) })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm p-3 bg-white dark:bg-gray-700 dark:text-white border text-base"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                                <textarea
                                    value={logForm.notes}
                                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm p-3 bg-white dark:bg-gray-700 dark:text-white border text-base"
                                    rows={3}
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-4 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setLogModalOpen(false)}
                                    className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-300 dark:hover:bg-gray-700 text-base"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-base font-medium"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
