"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";

export default function InventoryPage() {
    const { data: session } = useSession();
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ keyCode: "", silverCount: 0, goldCount: 0 });
    const [submitting, setSubmitting] = useState(false);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedKey, setSelectedKey] = useState<any>(null);
    const [brokenType, setBrokenType] = useState("SILVER");
    const [brokenCount, setBrokenCount] = useState(1);
    const [reporting, setReporting] = useState(false);

    const [search, setSearch] = useState("");
    const [showUnassigned, setShowUnassigned] = useState(false);

    const fetchKeys = async (query = "", unassigned = false) => {
        setLoading(true);
        let url = `/api/keys/inventory?search=${query}`;
        if (unassigned) url += "&status=unassigned";

        const res = await fetch(url);
        if (res.ok) setKeys(await res.json());
        setLoading(false);
    };

    useEffect(() => {
        fetchKeys(search, showUnassigned);
    }, [search, showUnassigned]);

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.keyCode) return;
        setSubmitting(true);

        const res = await fetch("/api/keys/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        if (res.ok) {
            setFormData({ keyCode: "", silverCount: 0, goldCount: 0 });
            fetchKeys(search, showUnassigned);
        } else {
            alert("Failed to add/update key");
        }
        setSubmitting(false);
    };

    const openReportModal = (key: any) => {
        setSelectedKey(key);
        setBrokenCount(1);
        setBrokenType("SILVER");
        setModalOpen(true);
    };

    const handleReportBroken = async () => {
        if (!selectedKey) return;
        setReporting(true);

        const res = await fetch("/api/keys/inventory", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selectedKey.id, type: brokenType, count: Number(brokenCount) }),
        });

        if (res.ok) {
            setModalOpen(false);
            fetchKeys(search, showUnassigned);
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Failed to report broken key");
        }
        setReporting(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Key Inventory (Skladište)</h1>

                    {/* Search and Filters */}
                    <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Search Key Code..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                        />
                        <label className="inline-flex items-center">
                            <input
                                type="checkbox"
                                checked={showUnassigned}
                                onChange={(e) => setShowUnassigned(e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Unassigned Only</span>
                        </label>
                    </div>
                </div>

                {/* Add Form (Admin Only) */}
                {(session?.user as any)?.role === "ADMIN" && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add / Update Stock</h2>
                        <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">Enter a Key Code. If it exists, stock will be added. If not, a new record is created.</p>
                        <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Key Code</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.keyCode}
                                    onChange={(e) => setFormData({ ...formData, keyCode: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add Silver</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.silverCount}
                                    onChange={(e) => setFormData({ ...formData, silverCount: parseInt(e.target.value) || 0 })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add Gold</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.goldCount}
                                    onChange={(e) => setFormData({ ...formData, goldCount: parseInt(e.target.value) || 0 })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                                />
                            </div>
                            <button type="submit" disabled={submitting} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                                {submitting ? "Updating..." : "Update Stock"}
                            </button>
                        </form>
                    </div>
                )}

                {/* List */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Silver (Good / Broken)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gold (Good / Broken)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                            ) : keys.map((key) => {
                                const isAssigned = key.assignments.length > 0;
                                return (
                                    <tr key={key.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{key.keyCode}</td>

                                        {/* Silver Column */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-700 dark:text-gray-200">{key.silverCount}</span>
                                                <span className="text-xs text-gray-400">/</span>
                                                <span className="text-red-500 font-medium">{key.brokenSilver} Broken</span>
                                            </div>
                                        </td>

                                        {/* Gold Column */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-700 dark:text-gray-200">{key.goldCount}</span>
                                                <span className="text-xs text-gray-400">/</span>
                                                <span className="text-red-500 font-medium">{key.brokenGold} Broken</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {isAssigned ? (
                                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                                    Assigned ({key.assignments.length})
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">Unassigned</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            {(session?.user as any)?.role === "ADMIN" && (
                                                <button
                                                    onClick={() => openReportModal(key)}
                                                    className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                                >
                                                    Report Broken
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Report Broken Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Report Broken Key: {selectedKey?.keyCode}</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                            <select
                                value={brokenType}
                                onChange={(e) => setBrokenType(e.target.value)}
                                className="w-full rounded-md border-gray-300 p-2 bg-white dark:bg-gray-700 dark:text-white border"
                            >
                                <option value="SILVER">Silver</option>
                                <option value="GOLD">Gold</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Count</label>
                            <input
                                type="number"
                                min="1"
                                value={brokenCount}
                                onChange={(e) => setBrokenCount(parseInt(e.target.value))}
                                className="w-full rounded-md border-gray-300 p-2 bg-white dark:bg-gray-700 dark:text-white border"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReportBroken}
                                disabled={reporting}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {reporting ? "Reporting..." : "Confirm Report"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
