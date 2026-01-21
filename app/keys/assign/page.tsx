"use client";

import { useState, useEffect, useRef } from "react";
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

    // Location search/dropdown
    const [locationSearch, setLocationSearch] = useState("");
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<any>(null);
    const locationDropdownRef = useRef<HTMLDivElement>(null);

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

    // Filtered locations based on search
    const filteredLocations = locations
        .filter((l: any) => l.status === "OPEN")
        .filter((l: any) =>
            l.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
            l.locationType.name.toLowerCase().includes(locationSearch.toLowerCase())
        );

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
                setShowLocationDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Select location handler
    const handleSelectLocation = (location: any) => {
        setSelectedLocation(location);
        setFormData({ ...formData, locationId: String(location.id) });
        setLocationSearch(`${location.name} (${location.locationType.name})`);
        setShowLocationDropdown(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Assign Key</h1>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">

                    {/* Location - Searchable Dropdown */}
                    <div ref={locationDropdownRef} className="relative">
                        <label className="block text-sm font-medium text-gray-900 dark:text-white">Location</label>
                        <input
                            type="text"
                            required={!formData.locationId}
                            placeholder="Počnite pisati za pretraživanje..."
                            value={locationSearch}
                            onChange={e => {
                                setLocationSearch(e.target.value);
                                setShowLocationDropdown(true);
                                // Clear selection if user edits
                                if (selectedLocation && e.target.value !== `${selectedLocation.name} (${selectedLocation.locationType.name})`) {
                                    setSelectedLocation(null);
                                    setFormData({ ...formData, locationId: "" });
                                }
                            }}
                            onFocus={() => setShowLocationDropdown(true)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                        />
                        {/* Hidden input for form validation */}
                        <input type="hidden" name="locationId" value={formData.locationId} required />

                        {showLocationDropdown && filteredLocations.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                {filteredLocations.map((l: any) => (
                                    <div
                                        key={l.id}
                                        onClick={() => handleSelectLocation(l)}
                                        className="px-3 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-800 text-gray-900 dark:text-white"
                                    >
                                        {l.name} <span className="text-gray-500 dark:text-gray-400">({l.locationType.name})</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {showLocationDropdown && locationSearch && filteredLocations.length === 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3 text-gray-500">
                                Nema rezultata
                            </div>
                        )}
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

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => router.push("/keys")}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
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
