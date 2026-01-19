"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Module = "keys" | "certificates" | "workhours";

interface Permission {
    module: Module;
    canView: boolean;
    canWrite: boolean;
}

interface User {
    id: number;
    username: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    permissions: Permission[];
}

const MODULES: { id: Module; name: string }[] = [
    { id: "keys", name: "Keys" },
    { id: "certificates", name: "Certificates" },
    { id: "workhours", name: "Working Hours" },
];

export default function AdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    // @ts-ignore
    const isAdmin = session?.user?.role === "ADMIN";

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [search, setSearch] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        role: "USER",
        isActive: true,
        permissions: MODULES.map(m => ({ module: m.id, canView: false, canWrite: false }))
    });
    const [showPassword, setShowPassword] = useState(false);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({
            username: "",
            password: "",
            role: "USER",
            isActive: true,
            permissions: MODULES.map(m => ({ module: m.id, canView: false, canWrite: false }))
        });
        setModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: "",
            role: user.role,
            isActive: user.isActive,
            permissions: MODULES.map(m => {
                const existing = user.permissions.find(p => p.module === m.id);
                return {
                    module: m.id,
                    canView: existing?.canView || false,
                    canWrite: existing?.canWrite || false
                };
            })
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const url = editingUser
            ? `/api/admin/users/${editingUser.id}`
            : "/api/admin/users";
        const method = editingUser ? "PUT" : "POST";

        const body: any = {
            username: formData.username,
            role: formData.role,
            isActive: formData.isActive,
            permissions: formData.permissions
        };

        // Only include password if provided
        if (formData.password) {
            body.password = formData.password;
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setModalOpen(false);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to save user");
            }
        } catch (error) {
            alert("Error saving user");
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete user");
            }
        } catch (error) {
            alert("Error deleting user");
        }
    };

    const updatePermission = (module: Module, field: "canView" | "canWrite", value: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.map(p => {
                if (p.module === module) {
                    // If enabling write, also enable view
                    if (field === "canWrite" && value) {
                        return { ...p, canView: true, canWrite: true };
                    }
                    // If disabling view, also disable write
                    if (field === "canView" && !value) {
                        return { ...p, canView: false, canWrite: false };
                    }
                    return { ...p, [field]: value };
                }
                return p;
            })
        }));
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase())
    );

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && !isAdmin) {
            router.push("/");
        }
    }, [status, isAdmin, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-semibold leading-6 text-gray-900 dark:text-white">
                            User Management
                        </h1>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                            Manage users and their permissions for each module.
                        </p>
                    </div>
                    <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                        <button
                            onClick={openCreateModal}
                            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                        >
                            Add User
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="mt-6 mb-4">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full max-w-xs rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                    />
                </div>

                {/* Users Table */}
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr className="divide-x divide-gray-200 dark:divide-gray-700">
                                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Username</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Role</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Keys</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Certificates</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Working Hours</th>
                                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                            {loading ? (
                                <tr><td colSpan={7} className="py-4 text-center">Loading...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={7} className="py-4 text-center text-gray-500">No users found.</td></tr>
                            ) : filteredUsers.map((user) => {
                                const getPermDisplay = (module: Module) => {
                                    if (user.role === "ADMIN") return "Full Access";
                                    const perm = user.permissions.find(p => p.module === module);
                                    if (!perm || !perm.canView) return "No Access";
                                    return perm.canWrite ? "Read/Write" : "Read Only";
                                };

                                return (
                                    <tr key={user.id} className="divide-x divide-gray-200 dark:divide-gray-700">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                                            {user.username}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${user.role === "ADMIN"
                                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${user.isActive
                                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                                }`}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            {getPermDisplay("keys")}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            {getPermDisplay("certificates")}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            {getPermDisplay("workhours")}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Add/Edit User Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                            {editingUser ? "Edit User" : "Add User"}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Username */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm p-3 bg-white dark:bg-gray-700 dark:text-white border"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Password {editingUser && "(leave blank to keep current)"}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm p-3 pr-10 bg-white dark:bg-gray-700 dark:text-white border"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm p-3 bg-white dark:bg-gray-700 dark:text-white border"
                                >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>

                            {/* Active Status */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                />
                                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    Active
                                </label>
                            </div>

                            {/* Permissions Matrix */}
                            {formData.role !== "ADMIN" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                        Module Permissions
                                    </label>
                                    <div className="border rounded-lg overflow-hidden dark:border-gray-600">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300">Module</th>
                                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-300">Can View</th>
                                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-300">Can Write</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                                {MODULES.map(module => {
                                                    const perm = formData.permissions.find(p => p.module === module.id)!;
                                                    return (
                                                        <tr key={module.id}>
                                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{module.name}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={perm.canView}
                                                                    onChange={(e) => updatePermission(module.id, "canView", e.target.checked)}
                                                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={perm.canWrite}
                                                                    onChange={(e) => updatePermission(module.id, "canWrite", e.target.checked)}
                                                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        Note: ADMIN users have full access to all modules.
                                    </p>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex justify-end gap-4 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                                >
                                    {editingUser ? "Save Changes" : "Create User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
