"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Permission {
    module: string;
    canView: boolean;
    canWrite: boolean;
}

export default function CertificatesPage() {
    const { data: session, status } = useSession();
    const [permissions, setPermissions] = useState<Permission[]>([]);

    // @ts-ignore
    const isAdmin = session?.user?.role === "ADMIN";

    const [certificates, setCertificates] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Filters
    const [showBlocked, setShowBlocked] = useState(false);
    const [filterHr, setFilterHr] = useState(false);
    const [filterSlo, setFilterSlo] = useState(false);
    const [filterGameId, setFilterGameId] = useState("");
    const [filterCabinetId, setFilterCabinetId] = useState("");

    // Filter options
    const [allGames, setAllGames] = useState<any[]>([]);
    const [allCabinetsFilter, setAllCabinetsFilter] = useState<any[]>([]);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    const [allCabinets, setAllCabinets] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

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
        const perm = permissions.find(p => p.module === "certificates");
        return perm?.canWrite || false;
    };

    const fetchCertificates = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                search,
                showBlocked: String(showBlocked),
                hr: String(filterHr),
                slo: String(filterSlo)
            });
            if (filterGameId) queryParams.set("gameId", filterGameId);
            if (filterCabinetId) queryParams.set("cabinetId", filterCabinetId);
            const res = await fetch(`/api/certificates?${queryParams}`);
            if (res.ok) {
                const data = await res.json();
                setCertificates(Array.isArray(data) ? data : []);
            } else {
                setCertificates([]);
            }
        } catch (e) {
            console.error(e);
            setCertificates([]);
        }
        setLoading(false);
    };

    const fetchAllCabinets = async () => {
        try {
            const res = await fetch("/api/certificates/dictionaries?type=cabinet");
            if (res.ok) {
                const data = await res.json();
                setAllCabinets(data.filter((c: any) => c.isActive !== false));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const [gamesRes, cabinetsRes] = await Promise.all([
                fetch("/api/certificates/dictionaries?type=game"),
                fetch("/api/certificates/dictionaries?type=cabinet")
            ]);
            if (gamesRes.ok) {
                const data = await gamesRes.json();
                setAllGames(data.filter((g: any) => g.isActive !== false));
            }
            if (cabinetsRes.ok) {
                const data = await cabinetsRes.json();
                setAllCabinetsFilter(data.filter((c: any) => c.isActive !== false));
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        fetchCertificates();
    }, [showBlocked, filterHr, filterSlo, filterGameId, filterCabinetId]); // Trigger on filter change

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCertificates();
    };

    const handleBlockToggle = async (cert: any) => {
        const newStatus = !cert.isActive;
        const res = await fetch("/api/certificates", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: cert.id, isActive: newStatus })
        });

        if (res.ok) {
            fetchCertificates();
        } else {
            alert("Failed to update status");
        }
    };

    const openEdit = (cert: any) => {
        fetchAllCabinets();
        setEditData({
            id: cert.id,
            name: cert.name,
            recognizedHr: cert.recognizedHr,
            forSlovenia: cert.forSlovenia,
            filePath: cert.filePath,
            cabinetIds: cert.cabinets?.map((c: any) => c.cabinet.id) || []
        });
        setEditModalOpen(true);
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
                setEditData((prev: any) => ({ ...prev, filePath: json.url }));
            } else {
                alert("Upload failed");
            }
        } catch (err) {
            console.error(err);
            alert("Upload error");
        }
        setUploading(false);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/certificates", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: editData.id,
                recognizedHr: editData.recognizedHr,
                forSlovenia: editData.forSlovenia,
                filePath: editData.filePath,
                cabinetIds: editData.cabinetIds
            })
        });

        if (res.ok) {
            setEditModalOpen(false);
            setEditData(null);
            fetchCertificates();
        } else {
            alert("Failed to save changes");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-semibold leading-6 text-gray-900 dark:text-white">
                            Certificates
                        </h1>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            Valid certificates linking Games, Boards, and Cabinets.
                        </p>
                    </div>
                    {canWrite() && (
                        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                            <Link
                                href="/certificates/new"
                                className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                Add New Certificate
                            </Link>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-end sm:items-center">
                        <form onSubmit={handleSearch} className="flex gap-4 w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Search by Cert, Game, Board, Cabinet..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="block w-full sm:w-80 rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                            />
                            <button
                                type="submit"
                                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
                            >
                                Search
                            </button>
                        </form>

                        <div className="flex flex-wrap gap-4 items-center">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filterHr}
                                    onChange={e => setFilterHr(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">HR Only</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filterSlo}
                                    onChange={e => setFilterSlo(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">SLO Only</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showBlocked}
                                    onChange={e => setShowBlocked(e.target.checked)}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Show Blocked</span>
                            </label>

                            {/* Game Filter */}
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Igrica:</span>
                                <select
                                    value={filterGameId}
                                    onChange={e => setFilterGameId(e.target.value)}
                                    className="rounded-md border-gray-300 shadow-sm p-1.5 bg-white dark:bg-gray-700 dark:text-white border text-sm"
                                >
                                    <option value="">Sve</option>
                                    {allGames.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Cabinet Filter */}
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Kućište:</span>
                                <select
                                    value={filterCabinetId}
                                    onChange={e => setFilterCabinetId(e.target.value)}
                                    className="rounded-md border-gray-300 shadow-sm p-1.5 bg-white dark:bg-gray-700 dark:text-white border text-sm"
                                >
                                    <option value="">Sva</option>
                                    {allCabinetsFilter.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Reset Filters */}
                            {(filterGameId || filterCabinetId || filterHr || filterSlo) && (
                                <button
                                    onClick={() => {
                                        setFilterGameId("");
                                        setFilterCabinetId("");
                                        setFilterHr(false);
                                        setFilterSlo(false);
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                                        Certificate
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                        Document
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                        Game (Igra)
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                        Board (Ploča)
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                        Cabinets (Kućišta)
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                        Status
                                    </th>
                                    {canWrite() && <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-4 text-center text-sm text-gray-500">Loading...</td>
                                    </tr>
                                ) : certificates.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-4 text-center text-sm text-gray-500">No certificates found.</td>
                                    </tr>
                                ) : (
                                    certificates.map((cert) => (
                                        <tr key={cert.id} className={cert.isActive === false ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                                <div>{cert.name}</div>
                                                <div className="flex gap-2 mt-1">
                                                    {cert.recognizedHr && <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">HR</span>}
                                                    {cert.forSlovenia && <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">SLO</span>}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                {cert.filePath ? (
                                                    <a href={cert.filePath} target="_blank" className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 font-medium">
                                                        Open 📄
                                                    </a>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                <div className="font-semibold">{cert.game?.name}</div>
                                                <div className="text-xs">{cert.game?.version}</div>
                                                <div className="text-xs text-gray-400">Reno: {cert.game?.renoId}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                {cert.board?.name}
                                                <div className="text-xs text-gray-400">{cert.board?.biosName}</div>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                <div className="flex flex-wrap gap-1">
                                                    {cert.cabinets?.map((c: any) => (
                                                        <span key={c.id} className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                                                            {c.cabinet?.name}
                                                        </span>
                                                    ))}
                                                    {(!cert.cabinets || cert.cabinets.length === 0) && '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                {cert.isActive === false ?
                                                    <span className="text-red-600 font-bold">Blocked</span> :
                                                    <span className="text-green-600">Active</span>
                                                }
                                            </td>
                                            {canWrite() && (
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                                    <button onClick={() => openEdit(cert)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400">
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleBlockToggle(cert)}
                                                        className={cert.isActive === false ? "text-green-600 hover:text-green-900 dark:text-green-400" : "text-red-600 hover:text-red-900 dark:text-red-400"}
                                                    >
                                                        {cert.isActive === false ? "Unblock" : "Block"}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Edit Modal */}
            {editModalOpen && editData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Edit Certificate: {editData.name}</h2>
                        <form onSubmit={handleSaveEdit} className="space-y-4">

                            <div className="flex gap-6">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={editData.recognizedHr}
                                        onChange={e => setEditData({ ...editData, recognizedHr: e.target.checked })}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">For HR</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={editData.forSlovenia}
                                        onChange={e => setEditData({ ...editData, forSlovenia: e.target.checked })}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">For SLO</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">File Path (Upload New)</label>
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
                                <div className="mt-2 text-xs text-gray-500 break-all">
                                    Current: {editData.filePath || "None"}
                                </div>
                            </div>

                            {/* Cabinet Editing */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cabinets (Kućišta)</label>

                                {/* Current cabinets */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {editData.cabinetIds?.map((cabId: number) => {
                                        const cab = allCabinets.find((c: any) => c.id === cabId);
                                        return (
                                            <span key={cabId} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm dark:bg-indigo-900 dark:text-indigo-200">
                                                {cab?.name || `ID: ${cabId}`}
                                                <button
                                                    type="button"
                                                    onClick={() => setEditData({
                                                        ...editData,
                                                        cabinetIds: editData.cabinetIds.filter((id: number) => id !== cabId)
                                                    })}
                                                    className="text-red-500 hover:text-red-700 ml-1"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        );
                                    })}
                                    {(!editData.cabinetIds || editData.cabinetIds.length === 0) && (
                                        <span className="text-gray-400 text-sm">No cabinets assigned</span>
                                    )}
                                </div>

                                {/* Add cabinet dropdown */}
                                <select
                                    onChange={(e) => {
                                        const newId = parseInt(e.target.value);
                                        if (newId && !editData.cabinetIds?.includes(newId)) {
                                            setEditData({
                                                ...editData,
                                                cabinetIds: [...(editData.cabinetIds || []), newId]
                                            });
                                        }
                                        e.target.value = "";
                                    }}
                                    className="block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border text-sm"
                                >
                                    <option value="">+ Add cabinet...</option>
                                    {allCabinets
                                        .filter((c: any) => !editData.cabinetIds?.includes(c.id))
                                        .map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="alert bg-yellow-50 text-yellow-800 p-2 rounded text-xs">
                                Note: Game and Board cannot be edited.
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
