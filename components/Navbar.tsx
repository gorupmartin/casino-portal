"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

interface Permission {
    module: string;
    canView: boolean;
    canWrite: boolean;
}

export default function Navbar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
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

    // Permission check helpers
    const canWriteModule = (module: string) => {
        if (isAdmin) return true;
        const perm = permissions.find(p => p.module === module);
        return perm?.canWrite || false;
    };

    const isActive = (path: string) => pathname === path;
    const currentTab = searchParams.get("tab");

    return (
        <nav className="bg-white shadow dark:bg-gray-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 justify-between">
                    <div className="flex">
                        <div className="flex flex-shrink-0 items-center">
                            <Link href="/" className="font-bold text-xl text-indigo-600 dark:text-indigo-400">
                                AssetPortal
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {/* Dashboard link removed as requested */}

                            {/* Keys Module Links */}
                            {(pathname.startsWith("/keys") || pathname.startsWith("/locations")) && (
                                <>
                                    <Link
                                        href="/keys"
                                        className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/keys") && !isActive("/keys/inventory")
                                            ? "border-indigo-500 text-gray-900 dark:text-white"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                            }`}
                                    >
                                        Assignments
                                    </Link>
                                    <Link
                                        href="/keys/inventory"
                                        className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/keys/inventory")
                                            ? "border-indigo-500 text-gray-900 dark:text-white"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                            }`}
                                    >
                                        Inventory
                                    </Link>
                                    {canWriteModule("keys") && (
                                        <>
                                            <Link
                                                href="/locations"
                                                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/locations")
                                                    ? "border-indigo-500 text-gray-900 dark:text-white"
                                                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                                    }`}
                                            >
                                                Locations
                                            </Link>
                                            <Link
                                                href="/keys/dictionaries"
                                                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/keys/dictionaries")
                                                    ? "border-indigo-500 text-gray-900 dark:text-white"
                                                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                                    }`}
                                            >
                                                Dictionaries
                                            </Link>
                                        </>
                                    )}
                                </>
                            )}

                            {/* Certificates Module Links */}
                            {pathname.startsWith("/certificates") && (
                                <>
                                    <Link
                                        href="/certificates"
                                        className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/certificates") && !isActive("/certificates/dictionaries") && !isActive("/certificates/games")
                                            ? "border-indigo-500 text-gray-900 dark:text-white"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                            }`}
                                    >
                                        Certificates
                                    </Link>
                                    {/* Games tab visible for all users with view permission (read-only mode for non-writers) */}
                                    <Link
                                        href="/certificates/games"
                                        className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/certificates/games")
                                            ? "border-indigo-500 text-gray-900 dark:text-white"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                            }`}
                                    >
                                        Games
                                    </Link>
                                    {canWriteModule("certificates") && (
                                        <Link
                                            href="/certificates/dictionaries"
                                            className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/certificates/dictionaries")
                                                ? "border-indigo-500 text-gray-900 dark:text-white"
                                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                                }`}
                                        >
                                            Dictionaries
                                        </Link>
                                    )}
                                </>
                            )}

                            {/* Working Hours Module Links */}
                            {pathname.startsWith("/workhours") && (
                                <>
                                    <Link
                                        href="/workhours?tab=summary"
                                        className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/workhours") && (currentTab === "summary" || currentTab === null) && !pathname.includes("/dictionaries")
                                            ? "border-indigo-500 text-gray-900 dark:text-white"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                            }`}
                                    >
                                        Summary
                                    </Link>
                                    {canWriteModule("workhours") && (
                                        <>
                                            <Link
                                                href="/workhours?tab=logs"
                                                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/workhours") && currentTab === "logs"
                                                    ? "border-indigo-500 text-gray-900 dark:text-white"
                                                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                                    }`}
                                            >
                                                Working Hours
                                            </Link>
                                            <Link
                                                href="/workhours/dictionaries"
                                                className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${pathname.includes("/dictionaries")
                                                    ? "border-indigo-500 text-gray-900 dark:text-white"
                                                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                                    }`}
                                            >
                                                Dictionaries
                                            </Link>
                                        </>
                                    )}
                                </>
                            )}

                            {/* Admin Module Links */}
                            {pathname.startsWith("/admin") && (
                                <>
                                    <Link
                                        href="/admin"
                                        className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${isActive("/admin") && !pathname.includes("/audit")
                                            ? "border-indigo-500 text-gray-900 dark:text-white"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                            }`}
                                    >
                                        Users
                                    </Link>
                                    <Link
                                        href="/admin/audit"
                                        className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${pathname.includes("/audit")
                                            ? "border-indigo-500 text-gray-900 dark:text-white"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                                            }`}
                                    >
                                        Audit Log
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center">
                        {session && (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {session.user?.name || (session.user as any).username} (
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                        {(session.user as any).role}
                                    </span>
                                    )
                                </span>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600"
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
