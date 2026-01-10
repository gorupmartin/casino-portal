"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";

type DictionaryType = "technicians" | "initial-hours";

export default function WorkHoursDictionaryManager() {
    const { data: session } = useSession();
    // @ts-ignore
    const isAdmin = session?.user?.role === "ADMIN";

    const [activeTab, setActiveTab] = useState<DictionaryType>("technicians");
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [techForm, setTechForm] = useState({ firstName: "", lastName: "" });
    const [initialForm, setInitialForm] = useState({ technicianId: "", hours: "" });

    const fetchTechnicians = async () => {
        setLoading(true);
        const res = await fetch("/api/workhours/technicians");
        if (res.ok) setTechnicians(await res.json());
        setLoading(false);
    };

    useEffect(() => {
        fetchTechnicians();
    }, []);

    const filteredTechnicians = technicians.filter(t =>
        t.firstName.toLowerCase().includes(search.toLowerCase()) ||
        t.lastName.toLowerCase().includes(search.toLowerCase())
    );

    const activeTechs = technicians.filter(t => t.isActive);

    const handleAddTechnician = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/workhours/technicians", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(techForm)
        });
        if (res.ok) {
            setModalOpen(false);
            setTechForm({ firstName: "", lastName: "" });
            fetchTechnicians();
        } else {
            alert("Failed to add technician");
        }
    };

    const handleToggleTech = async (tech: any) => {
        const res = await fetch("/api/workhours/technicians", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: tech.id, isActive: !tech.isActive })
        });
        if (res.ok) {
            fetchTechnicians();
        }
    };

    const handleSetInitialHours = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/workhours/initial-hours", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(initialForm)
        });
        if (res.ok) {
            setModalOpen(false);
            setInitialForm({ technicianId: "", hours: "" });
            fetchTechnicians();
        } else {
            alert("Failed to set initial hours");
        }
    };

    const openModal = () => {
        if (activeTab === "technicians") {
            setTechForm({ firstName: "", lastName: "" });
        } else {
            setInitialForm({ technicianId: "", hours: "" });
        }
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Working Hours Dictionaries</h1>
                    <button
                        onClick={openModal}
                        className="mt-4 md:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                        {activeTab === "technicians" ? "Add Technician" : "Set Initial Hours"}
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {[
                            { id: "technicians", name: "Technicians" },
                            { id: "initial-hours", name: "Initial Hours" },
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

                {/* TECHNICIANS TAB */}
                {activeTab === "technicians" && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">First Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr>
                                ) : filteredTechnicians.length === 0 ? (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">No technicians found.</td></tr>
                                ) : filteredTechnicians.map((tech) => (
                                    <tr key={tech.id} className={tech.isActive === false ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {tech.firstName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                            {tech.lastName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {tech.isActive !== false ? (
                                                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleToggleTech(tech)}
                                                className={`${tech.isActive !== false ? 'text-red-600 hover:text-red-900 dark:text-red-400' : 'text-green-600 hover:text-green-900 dark:text-green-400'}`}
                                            >
                                                {tech.isActive !== false ? "Block" : "Unblock"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* INITIAL HOURS TAB */}
                {activeTab === "initial-hours" && (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Technician</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Initial Hours</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={3} className="p-4 text-center">Loading...</td></tr>
                                ) : activeTechs.length === 0 ? (
                                    <tr><td colSpan={3} className="p-4 text-center text-gray-500">No active technicians.</td></tr>
                                ) : activeTechs.filter(t =>
                                    t.firstName.toLowerCase().includes(search.toLowerCase()) ||
                                    t.lastName.toLowerCase().includes(search.toLowerCase())
                                ).map((tech) => (
                                    <tr key={tech.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {tech.firstName} {tech.lastName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-semibold">
                                            {tech.initialHours?.hours ? Number(tech.initialHours.hours) : 0} h
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Modal for Adding Technician */}
            {modalOpen && activeTab === "technicians" && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Add New Technician</h3>
                        <form onSubmit={handleAddTechnician} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                                <input
                                    type="text"
                                    required
                                    value={techForm.firstName}
                                    onChange={(e) => setTechForm({ ...techForm, firstName: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                                <input
                                    type="text"
                                    required
                                    value={techForm.lastName}
                                    onChange={(e) => setTechForm({ ...techForm, lastName: e.target.value })}
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

            {/* Modal for Setting Initial Hours */}
            {modalOpen && activeTab === "initial-hours" && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Set Initial Hours</h3>
                        <form onSubmit={handleSetInitialHours} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Technician</label>
                                <select
                                    required
                                    value={initialForm.technicianId}
                                    onChange={(e) => setInitialForm({ ...initialForm, technicianId: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                                >
                                    <option value="">Select...</option>
                                    {activeTechs.map(t => (
                                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Initial Hours</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={initialForm.hours}
                                    onChange={(e) => setInitialForm({ ...initialForm, hours: e.target.value })}
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
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
