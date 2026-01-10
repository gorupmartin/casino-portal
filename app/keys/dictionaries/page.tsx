"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";

type DictionaryType = "location-type" | "position" | "key-type";

export default function KeysDictionaryManager() {
    const { data: session } = useSession();
    // @ts-ignore
    const isAdmin = session?.user?.role === "ADMIN";

    const [activeTab, setActiveTab] = useState<DictionaryType>("location-type");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState<any>({});

    const fetchItems = async () => {
        setLoading(true);
        const res = await fetch(`/api/keys/dictionaries?type=${activeTab}&search=${search}`);
        if (res.ok) setItems(await res.json());
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, [activeTab, search]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        // Always POST for new items since Edit is removed
        const method = "POST";
        const body = { type: activeTab, ...formData, isActive: true }; // Default new items to active

        const res = await fetch("/api/keys/dictionaries", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            setModalOpen(false);
            setFormData({});
            fetchItems();
        } else {
            const err = await res.json();
            alert(err.error || "Failed to save item");
        }
    };

    const handleToggleStatus = async (item: any) => {
        // Toggle Active Status
        const newStatus = !item.isActive;
        const res = await fetch("/api/keys/dictionaries", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: activeTab,
                id: item.id,
                isActive: newStatus
            }),
        });

        if (res.ok) {
            fetchItems(); // Refresh list to reflect change
        } else {
            const err = await res.json();
            alert(err.error || "Failed to update status");
        }
    };

    const openModal = () => {
        setFormData({});
        setModalOpen(true);
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-gray-500">Authorized access only.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Keys Dictionaries</h1>
                    <button
                        onClick={openModal}
                        className="mt-4 md:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                        Add New Item
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {[
                            { id: "location-type", name: "Location Types" },
                            { id: "position", name: "Cabinet Positions" },
                            { id: "key-type", name: "Key Types" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as DictionaryType)}
                                className={`${activeTab === tab.id
                                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Search */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full max-w-xs rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                    />
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={3} className="p-4 text-center">Loading...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={3} className="p-4 text-center text-gray-500">No items found.</td></tr>
                            ) : items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {item.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {item.isActive ? (
                                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Inactive</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleToggleStatus(item)}
                                            className={`${item.isActive ? 'text-red-600 hover:text-red-900 dark:text-red-400' : 'text-green-600 hover:text-green-900 dark:text-green-400'}`}
                                        >
                                            {item.isActive ? "Block" : "Unblock"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Modal - ONLY FOR CREATING NEW */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Add New {activeTab}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
