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

export default function AssignmentsPage() {
    const { data: session, status } = useSession();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<Permission[]>([]);

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

    const fetchAssignments = async (query = "") => {
        setLoading(true);
        const res = await fetch(`/api/assignments?search=${query}`);
        if (res.ok) setAssignments(await res.json());
        setLoading(false);
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchAssignments(search);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to unassign this key?")) return;

        const res = await fetch("/api/assignments", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
        });

        if (res.ok) {
            fetchAssignments(search);
        } else {
            alert("Failed to unassign.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-semibold leading-6 text-gray-900 dark:text-white">
                            Assignments (Dodjele)
                        </h1>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            Overview of deployed keys.
                        </p>
                    </div>
                    {canWrite() && (
                        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                            <Link
                                href="/keys/assign"
                                className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                Assign Key
                            </Link>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <form onSubmit={handleSearch} className="flex gap-4 mb-6">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                        />
                    </form>

                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr className="divide-x divide-gray-200 dark:divide-gray-700">
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Location</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Key Code</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Counts (S/G)</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Purpose</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Position</th>
                                    {canWrite() && (
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                {loading ? (
                                    <tr><td colSpan={7} className="py-4 text-center">Loading...</td></tr>
                                ) : assignments.map((a) => (
                                    <tr key={a.id} className="divide-x divide-gray-200 dark:divide-gray-700">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                                            {a.location.name}
                                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${a.location.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {a.location.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{a.location.locationType.name}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{a.key.keyCode}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            {a.key.silverCount} / {a.key.goldCount}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{a.keyType.name}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{a.cabinetPosition.name}</td>
                                        {canWrite() && (
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                <button
                                                    onClick={() => handleDelete(a.id)}
                                                    className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                                >
                                                    Unassign
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
