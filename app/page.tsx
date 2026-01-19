"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

interface Permission {
    module: string;
    canView: boolean;
    canWrite: boolean;
}

export default function Home() {
    const { data: session, status } = useSession();
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    // @ts-ignore
    const isAdmin = session?.user?.role === "ADMIN";

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
            setLoading(false);
        };

        if (status !== "loading") {
            fetchPermissions();
        }
    }, [status, isAdmin]);

    const canViewModule = (module: string) => {
        if (isAdmin) return true;
        const perm = permissions.find(p => p.module === module);
        return perm?.canView || false;
    };

    const handleSignOut = () => {
        signOut({ callbackUrl: "/login" });
    };

    // Calculate visible tabs for dynamic centering
    const visibleTabs = [
        canViewModule("workhours"),
        canViewModule("keys"),
        canViewModule("certificates"),
        isAdmin
    ].filter(Boolean).length;

    // Dynamic grid classes based on visible tab count
    const getGridClasses = () => {
        switch (visibleTabs) {
            case 1:
                return "grid-cols-1 max-w-md";
            case 2:
                return "grid-cols-1 sm:grid-cols-2 max-w-2xl";
            case 3:
                return "grid-cols-1 sm:grid-cols-3 max-w-4xl";
            case 4:
            default:
                return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl";
        }
    };

    if (status === "loading" || loading) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900">
                <p className="text-gray-500">Loading...</p>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900">
            {/* Sign Out Button */}
            <div className="absolute top-4 right-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-300">
                        {/* @ts-ignore */}
                        {session?.user?.username || session?.user?.name} ({isAdmin ? "ADMIN" : "USER"})
                    </span>
                    <button
                        onClick={handleSignOut}
                        className="rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-gray-600 hover:bg-gray-600"
                    >
                        Sign out
                    </button>
                </div>
            </div>

            <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
                <h1 className="text-4xl font-bold text-center mb-12 w-full text-indigo-400">
                    Casino & Slot Asset Portal
                </h1>
            </div>

            <div className={`mb-32 grid text-center lg:mb-0 w-full ${getGridClasses()} mx-auto gap-8`}>
                {canViewModule("workhours") && (
                    <Link
                        href="/workhours"
                        className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-neutral-700 hover:bg-neutral-800/30"
                    >
                        <h2 className="mb-3 text-2xl font-semibold text-gray-100">
                            Working Hours{" "}
                            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                                -&gt;
                            </span>
                        </h2>
                        <p className="m-0 max-w-[30ch] text-sm opacity-50 text-gray-400 mx-auto">
                            Track Technician Hours, Work Logs, and Overtime.
                        </p>
                    </Link>
                )}

                {canViewModule("keys") && (
                    <Link
                        href="/keys"
                        className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-neutral-700 hover:bg-neutral-800/30"
                    >
                        <h2 className="mb-3 text-2xl font-semibold text-gray-100">
                            Keys Database{" "}
                            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                                -&gt;
                            </span>
                        </h2>
                        <p className="m-0 max-w-[30ch] text-sm opacity-50 text-gray-400 mx-auto">
                            Manage Keys for Terminals, Clubs, and Betting Shops.
                        </p>
                    </Link>
                )}

                {canViewModule("certificates") && (
                    <Link
                        href="/certificates"
                        className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-neutral-700 hover:bg-neutral-800/30"
                    >
                        <h2 className="mb-3 text-2xl font-semibold text-gray-100">
                            Certificates Database{" "}
                            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                                -&gt;
                            </span>
                        </h2>
                        <p className="m-0 max-w-[30ch] text-sm opacity-50 text-gray-400 mx-auto">
                            Track Certificates, Games, Main Boards, and Cabinets.
                        </p>
                    </Link>
                )}

                {isAdmin && (
                    <Link
                        href="/admin"
                        className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-neutral-700 hover:bg-neutral-800/30"
                    >
                        <h2 className="mb-3 text-2xl font-semibold text-gray-100">
                            Admin{" "}
                            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                                -&gt;
                            </span>
                        </h2>
                        <p className="m-0 max-w-[30ch] text-sm opacity-50 text-gray-400 mx-auto">
                            Manage Users and Module Permissions.
                        </p>
                    </Link>
                )}
            </div>
        </main>
    );
}
