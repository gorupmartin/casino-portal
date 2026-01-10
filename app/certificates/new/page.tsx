"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

export default function NewCertificatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Dictionaries
    const [games, setGames] = useState<any[]>([]);
    const [boards, setBoards] = useState<any[]>([]);
    const [cabinets, setCabinets] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        recognizedHr: true,
        forSlovenia: false,
        filePath: "",
        gameId: "",
        boardId: "",
        cabinetIds: [] as string[] // Array of selected IDs
    });

    useEffect(() => {
        // Fetch dictionaries
        const fetchDicts = async () => {
            const [accGames, accBoards, accCabinets] = await Promise.all([
                fetch("/api/certificates/dictionaries?type=game").then(r => r.json()),
                fetch("/api/certificates/dictionaries?type=board").then(r => r.json()),
                fetch("/api/certificates/dictionaries?type=cabinet").then(r => r.json()),
            ]);

            // Filter only active items if not handled by API
            // Assuming API might return all, we filter here just in case, or API does it. 
            // Previous api returned all by default.
            if (Array.isArray(accGames)) setGames(accGames.filter((i: any) => i.isActive !== false));
            if (Array.isArray(accBoards)) setBoards(accBoards.filter((i: any) => i.isActive !== false));
            if (Array.isArray(accCabinets)) setCabinets(accCabinets.filter((i: any) => i.isActive !== false));
        };
        fetchDicts();
    }, []);

    const toggleCabinet = (id: string) => {
        setFormData(prev => {
            const exists = prev.cabinetIds.includes(id);
            if (exists) {
                return { ...prev, cabinetIds: prev.cabinetIds.filter(c => c !== id) };
            } else {
                return { ...prev, cabinetIds: [...prev.cabinetIds, id] };
            }
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const data = new FormData();
        data.append("file", file);

        setUploading(true);
        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: data,
            });
            const json = await res.json();
            if (json.success) {
                setFormData(prev => ({ ...prev, filePath: json.url }));
            } else {
                alert("Upload failed");
            }
        } catch (err) {
            console.error(err);
            alert("Upload error");
        }
        setUploading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.gameId || !formData.boardId || formData.cabinetIds.length === 0) {
            alert("Please fill all required fields and select at least one cabinet.");
            return;
        }

        setLoading(true);
        const res = await fetch("/api/certificates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        if (res.ok) {
            router.push("/certificates");
            router.refresh();
        } else {
            const err = await res.json();
            alert(err.error || "Failed to create certificate");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Add New Certificate</h1>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Certificate Name / Number</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">File Path (Upload)</label>
                            <div className="mt-1 flex items-center gap-4">
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-md file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-indigo-50 file:text-indigo-700
                                        hover:file:bg-indigo-100 dark:file:bg-gray-700 dark:file:text-gray-300"
                                />
                                {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
                            </div>
                            {formData.filePath && (
                                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                                    ✓ File uploaded: <a href={formData.filePath} target="_blank" className="underline">{formData.filePath.split('/').pop()}</a>
                                </p>
                            )}
                            <input type="hidden" value={formData.filePath} />
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.recognizedHr}
                                onChange={e => setFormData({ ...formData, recognizedHr: e.target.checked })}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">For HR</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={formData.forSlovenia}
                                onChange={e => setFormData({ ...formData, forSlovenia: e.target.checked })}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">For SLO</span>
                        </label>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6"></div>

                    {/* Combinations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Game (Select One)</label>
                            <select
                                required
                                value={formData.gameId}
                                onChange={e => setFormData({ ...formData, gameId: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                            >
                                <option value="">Select Game...</option>
                                {games.map(g => (
                                    <option key={g.id} value={g.id}>{g.name} (v{g.version})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Board (Select One)</label>
                            <select
                                required
                                value={formData.boardId}
                                onChange={e => setFormData({ ...formData, boardId: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                            >
                                <option value="">Select Board...</option>
                                {boards.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} {b.biosName ? `(Bios: ${b.biosName})` : ""}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cabinets (Select Multiple)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                            {cabinets.map(c => (
                                <label key={c.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={formData.cabinetIds.includes(String(c.id))}
                                        onChange={() => toggleCabinet(String(c.id))}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {c.name} {c.drawerType ? `(${c.drawerType})` : ""}
                                    </span>
                                </label>
                            ))}
                            {cabinets.length === 0 && <span className="text-gray-500 text-sm">No active cabinets found.</span>}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Only active (non-blocked) cabinets are shown.</p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {loading ? "Saving..." : "Create Certificate"}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
