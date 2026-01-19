"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";

interface Permission {
    module: string;
    canView: boolean;
    canWrite: boolean;
}

export default function LocationsPage() {
    const { data: session, status } = useSession();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [locationTypes, setLocationTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [newTypeId, setNewTypeId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // @ts-ignore
    const isAdmin = session?.user?.role === "ADMIN";

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
        const perm = permissions.find(p => p.module === "keys");
        return perm?.canWrite || false;
    };

    const fetchLocations = async () => {
        setLoading(true);
        const res = await fetch("/api/locations");
        if (res.ok) setLocations(await res.json());
        setLoading(false);
    };

    const fetchTypes = async () => {
        const res = await fetch("/api/location-types?active=true");
        if (res.ok) setLocationTypes(await res.json());
    };

    useEffect(() => {
        fetchLocations();
        fetchTypes();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newTypeId) return;
        setSubmitting(true);

        const res = await fetch("/api/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, locationTypeId: newTypeId }),
        });

        if (res.ok) {
            setNewName("");
            setNewTypeId("");
            fetchLocations();
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Failed to create location");
        }
        setSubmitting(false);
    };

    const handleStatusToggle = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
        const res = await fetch("/api/locations", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: newStatus }),
        });

        if (res.ok) {
            fetchLocations();
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Failed to update location status");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Locations Management (Poslovnice)</h1>

                {/* Add Form (Users with canWrite permission) */}
                {canWrite() && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Location</h2>
                        <form onSubmit={handleCreate} className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                                <select
                                    required
                                    value={newTypeId}
                                    onChange={(e) => setNewTypeId(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                                >
                                    <option value="">Select Type</option>
                                    {locationTypes.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {submitting ? "Adding..." : "Add"}
                            </button>
                        </form>
                    </div>
                )}

                {/* List */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                {canWrite() && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={canWrite() ? 5 : 4} className="p-4 text-center text-sm text-gray-500">Loading...</td></tr>
                            ) : locations.map((loc) => (
                                <tr key={loc.id} className={loc.status === "CLOSED" ? "opacity-60 bg-gray-50 dark:bg-gray-900" : ""}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{loc.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{loc.name} {loc.status === "CLOSED" && "(Closed)"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <span className="bg-gray-100 text-gray-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                                            {loc.locationType.name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${loc.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {loc.status}
                                        </span>
                                    </td>
                                    {canWrite() && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleStatusToggle(loc.id, loc.status)}
                                                className={`text-sm font-medium px-3 py-1 rounded ${loc.status === 'OPEN'
                                                    ? 'text-red-600 hover:text-red-900 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                    : 'text-green-600 hover:text-green-900 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                    }`}
                                            >
                                                {loc.status === 'OPEN' ? 'Close' : 'Open'}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
