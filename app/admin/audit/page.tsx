"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AuditLog {
    id: number;
    timestamp: string;
    userId: number | null;
    username: string;
    action: string;
    tableName: string;
    recordId: number | null;
    oldValue: string | null;
    newValue: string | null;
    description: string | null;
}

export default function AuditLogPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    // @ts-ignore
    const isAdmin = session?.user?.role === "ADMIN";

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filterTable, setFilterTable] = useState("");
    const [filterAction, setFilterAction] = useState("");
    const [expandedLog, setExpandedLog] = useState<number | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterTable) params.set("table", filterTable);
            if (filterAction) params.set("action", filterAction);

            const res = await fetch(`/api/admin/audit?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setTotal(data.total);
            }
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchLogs();
        }
    }, [isAdmin, filterTable, filterAction]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && !isAdmin) {
            router.push("/");
        }
    }, [status, isAdmin, router]);

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        return date.toLocaleString("hr-HR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    };

    const formatJson = (json: string | null) => {
        if (!json) return null;
        try {
            const parsed = JSON.parse(json);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return json;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case "CREATE": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
            case "UPDATE": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
            case "DELETE": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
            default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
        }
    };

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

    if (!isAdmin) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-semibold leading-6 text-gray-900 dark:text-white">
                            Audit Log
                        </h1>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            Track all changes made in the system. Total entries: {total}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="mt-6 flex gap-4 flex-wrap">
                    <select
                        value={filterTable}
                        onChange={(e) => setFilterTable(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                    >
                        <option value="">All Tables</option>
                        <option value="User">User</option>
                        <option value="UserPermission">UserPermission</option>
                        <option value="WorkLog">WorkLog</option>
                        <option value="Technician">Technician</option>
                        <option value="InitialHours">InitialHours</option>
                        <option value="Key">Key</option>
                        <option value="KeyAssignment">KeyAssignment</option>
                        <option value="Location">Location</option>
                        <option value="CertificateDefinition">Certificate</option>
                    </select>
                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE">CREATE</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                    <button
                        onClick={fetchLogs}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        Refresh
                    </button>
                </div>

                {/* Audit Log Table */}
                <div className="mt-6 overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Timestamp</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">User</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Table</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Record ID</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                            {loading ? (
                                <tr><td colSpan={6} className="py-4 text-center">Loading...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={6} className="py-4 text-center text-gray-500">No audit logs found.</td></tr>
                            ) : logs.map((log) => (
                                <>
                                    <tr
                                        key={log.id}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                    >
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 dark:text-white">
                                            {formatTimestamp(log.timestamp)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            {log.username}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            {log.tableName}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            {log.recordId || "-"}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                                            {log.description || "-"}
                                        </td>
                                    </tr>
                                    {expandedLog === log.id && (log.oldValue || log.newValue) && (
                                        <tr key={`${log.id}-details`}>
                                            <td colSpan={6} className="px-4 py-4 bg-gray-50 dark:bg-gray-800">
                                                <div className="grid grid-cols-2 gap-4">
                                                    {log.oldValue && (
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Old Value:</h4>
                                                            <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                                                                {formatJson(log.oldValue)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {log.newValue && (
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">New Value:</h4>
                                                            <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                                                                {formatJson(log.newValue)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
