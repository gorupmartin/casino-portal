"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

export default function NewKeyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState<any[]>([]);
    const [keyTypes, setKeyTypes] = useState<any[]>([]);

    useEffect(() => {
        // Fetch Locations
        fetch("/api/locations").then(res => res.json()).then(setLocations).catch(console.error);
        // Fetch KeyTypes
        fetch("/api/key-types").then(res => res.json()).then(setKeyTypes).catch(console.error);
    }, []);

    const [formData, setFormData] = useState({
        keyCode: "",
        silverCount: 0,
        goldCount: 0,
        brokenCount: 0,
        position: "",
        locationId: "",
        keyTypeId: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await fetch("/api/keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        if (res.ok) {
            router.push("/keys");
            router.refresh();
        } else {
            alert("Failed to create key");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Add New Key</h1>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Location</label>
                            <select
                                required
                                value={formData.locationId}
                                onChange={e => setFormData({ ...formData, locationId: e.target.value })}
                                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Select Location</option>
                                {locations.map((loc: any) => (
                                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Purpose (Namjena)</label>
                            <select
                                required
                                value={formData.keyTypeId}
                                onChange={e => setFormData({ ...formData, keyTypeId: e.target.value })}
                                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Select Purpose</option>
                                {keyTypes.map((kt: any) => (
                                    <option key={kt.id} value={kt.id}>{kt.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Key Code (Šifra)</label>
                        <input
                            type="text"
                            required
                            value={formData.keyCode}
                            onChange={e => setFormData({ ...formData, keyCode: e.target.value })}
                            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Silver Keys</label>
                            <input
                                type="number"
                                value={formData.silverCount}
                                onChange={e => setFormData({ ...formData, silverCount: parseInt(e.target.value) })}
                                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Gold Keys</label>
                            <input
                                type="number"
                                value={formData.goldCount}
                                onChange={e => setFormData({ ...formData, goldCount: parseInt(e.target.value) })}
                                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium leading-6 text-red-600 dark:text-red-400">Broken (Slomljeni)</label>
                            <input
                                type="number"
                                value={formData.brokenCount}
                                onChange={e => setFormData({ ...formData, brokenCount: parseInt(e.target.value) })}
                                className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-red-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Position</label>
                        <input
                            type="text"
                            value={formData.position}
                            onChange={e => setFormData({ ...formData, position: e.target.value })}
                            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            {loading ? "Saving..." : "Save Key"}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
