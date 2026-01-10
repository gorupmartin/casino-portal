"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

export default function AssignKeyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Data Sources
    const [locations, setLocations] = useState<any[]>([]);
    const [keys, setKeys] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);

    // Form
    const [formData, setFormData] = useState({
        locationId: "",
        keyId: "",
        cabinetPositionId: "",
        keyTypeId: ""
    });

    useEffect(() => {
        const noCache = { cache: "no-store" } as RequestInit;
        fetch("/api/locations", noCache).then(res => res.json()).then(setLocations);
        fetch("/api/keys/inventory", noCache).then(res => res.json()).then(setKeys);
        fetch("/api/cabinet-positions?active=true", noCache).then(res => res.json()).then(setPositions);
        fetch("/api/key-types?active=true", noCache).then(res => res.json()).then(setTypes);
        fetch("/api/assignments", noCache).then(res => res.json()).then(data => {
            console.log("Assignments fetched:", data);
            setAssignments(data);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await fetch("/api/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        if (res.ok) {
            router.push("/keys");
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || "Failed to assign key");
        }
        setLoading(false);
    };

    // Derived state for filtering
    // GLOBAL CABINET: Filter unique positions across ALL assignments
    const globalTakenPositions = assignments.map((a: any) => a.cabinetPositionId);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Assign Key</h1>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">Location</label>
                        <select
                            required
                            value={formData.locationId}
                            onChange={e => setFormData({ ...formData, locationId: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                        >
                            <option value="">Select Location</option>
                            {locations.filter((l: any) => l.status === "OPEN").map((l: any) => (
                                <option key={l.id} value={l.id}>{l.name} ({l.locationType.name})</option>
                            ))}
                        </select>
                    </div>

                    {/* Key (Unassigned only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">Key Code (Inventory)</label>
                        <select
                            required
                            value={formData.keyId}
                            onChange={e => setFormData({ ...formData, keyId: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                        >
                            <option value="">Select Key Code</option>
                            {keys.filter((k: any) => k.assignments.length === 0).map((k: any) => (
                                <option key={k.id} value={k.id}>{k.keyCode} (S:{k.silverCount}/G:{k.goldCount})</option>
                            ))}
                        </select>
                    </div>

                    {/* Purpose */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">Purpose (Namjena)</label>
                        <select
                            required
                            value={formData.keyTypeId}
                            onChange={e => setFormData({ ...formData, keyTypeId: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                        >
                            <option value="">Select Purpose</option>
                            {types.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Position */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">Cabinet Position</label>
                        <select
                            required
                            value={formData.cabinetPositionId}
                            onChange={e => setFormData({ ...formData, cabinetPositionId: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                        >
                            <option value="">Select Position</option>
                            {positions.filter((p: any) => !globalTakenPositions.includes(p.id)).map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            {loading ? "Assigning..." : "Assign Key"}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
