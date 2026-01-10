"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";

interface DictionaryItem {
    id: number;
    name: string;
    isActive: boolean;
}

interface Props {
    title: string;
    apiEndpoint: string;
}

export default function DictionaryManager({ title, apiEndpoint }: Props) {
    const { data: session } = useSession();
    const [items, setItems] = useState<DictionaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchItems = async () => {
        setLoading(true);
        const res = await fetch(apiEndpoint); // Admin view (defaults to all)
        if (res.ok) setItems(await res.json());
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, [apiEndpoint]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setSubmitting(true);

        const res = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName }),
        });

        if (res.ok) {
            setNewName("");
            fetchItems();
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Failed to create item");
        }
        setSubmitting(false);
    };

    const handleToggle = async (id: number, currentStatus: boolean) => {
        const res = await fetch(apiEndpoint, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, isActive: !currentStatus }),
        });

        if (res.ok) {
            fetchItems();
        } else {
            const error = await res.json();
            alert(error.error || "Failed to update item");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{title}</h1>

                {/* Add Form (Admin Only) */}
                {(session?.user as any)?.role === "ADMIN" && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New {title}</h2>
                        <form onSubmit={handleCreate} className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 border"
                                />
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">Loading...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">No items found.</td></tr>
                            ) : items.map((item) => (
                                <tr key={item.id} className={!item.isActive ? "bg-gray-50 dark:bg-gray-900 opacity-75" : ""}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.id}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white ${!item.isActive ? "line-through text-gray-400" : ""}`}>{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.isActive ? 'Active' : 'Blocked'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {(session?.user as any)?.role === "ADMIN" && (
                                            <button
                                                onClick={() => handleToggle(item.id, item.isActive)}
                                                className={`text-sm ${item.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                                            >
                                                {item.isActive ? 'Block' : 'Unblock'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
