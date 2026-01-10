"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSession } from "next-auth/react";

export default function GamesManager() {
    const { data: session } = useSession();
    // @ts-ignore
    const isAdmin = session?.user?.role === "ADMIN";

    const [games, setGames] = useState<any[]>([]);
    const [controllers, setControllers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Game Modal
    const [gameModalOpen, setGameModalOpen] = useState(false);
    const [gameForm, setGameForm] = useState<any>({});

    // Jackpot Modal (Nested inside Edit Game loop essentially, or separately)
    // To keep it simple, we'll edit jackpots in the Edit Game modal directly.

    const fetchGames = async () => {
        setLoading(true);
        const res = await fetch(`/api/certificates/games?search=${search}`);
        if (res.ok) setGames(await res.json());
        setLoading(false);
    };

    const fetchControllers = async () => {
        const res = await fetch(`/api/certificates/dictionaries?type=controller`);
        if (res.ok) setControllers(await res.json());
    };

    useEffect(() => {
        fetchGames();
        fetchControllers();
    }, [search]);

    const handleSaveGame = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = gameForm.id ? "PUT" : "POST";

        // Sanitize payload
        const payload = {
            id: gameForm.id,
            name: gameForm.name,
            version: gameForm.version,
            renoId: gameForm.renoId,
            isActive: gameForm.isActive
        };

        const res = await fetch("/api/certificates/games", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            setGameModalOpen(false);
            setGameForm({});
            fetchGames();
        } else {
            const err = await res.json();
            alert(err.error || "Failed to save game");
        }
    };

    const handleToggleStatus = async (game: any) => {
        const newStatus = !game.isActive;
        const res = await fetch("/api/certificates/games", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: game.id,
                isActive: newStatus
            }),
        });

        if (res.ok) {
            fetchGames();
        } else {
            const err = await res.json();
            alert(err.error || "Failed to update status");
        }
    };

    // Jackpot Handlers
    const [jackpotForm, setJackpotForm] = useState<any>({});

    const handleAddJackpot = async () => {
        if (!jackpotForm.controllerId) return alert("Select a controller");

        const res = await fetch("/api/certificates/games/jackpots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...jackpotForm, gameId: gameForm.id }),
        });

        if (res.ok) {
            setJackpotForm({});
            // Refresh games to get updated list
            fetchGames();
            // Optimization: Update local state if possible, but fetch is safer
            // We need to re-open the modal with updated data? No, if we fetchGames, the current games list updates.
            // But we are binding the modal to `gameForm`. We need to update `gameForm` too or re-find the game.
            const newGames = await (await fetch(`/api/certificates/games?search=${search}`)).json();
            setGames(newGames);
            const updatedGame = newGames.find((g: any) => g.id === gameForm.id);
            if (updatedGame) setGameForm(updatedGame);

        } else {
            alert("Failed to add jackpot");
        }
    };

    const handleToggleJackpotStatus = async (id: number, currentStatus: boolean | undefined) => {
        // Default undefined means active (true)
        const newStatus = currentStatus === false ? true : false;

        const res = await fetch("/api/certificates/games/jackpots", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id,
                isActive: newStatus
            }),
        });

        if (res.ok) {
            const newGames = await (await fetch(`/api/certificates/games?search=${search}`)).json();
            setGames(newGames);
            const updatedGame = newGames.find((g: any) => g.id === gameForm.id);
            if (updatedGame) setGameForm(updatedGame);
        } else {
            alert("Failed to update jackpot status");
        }
    };

    const openEditGame = (game: any) => {
        setGameForm({ ...game }); // This includes jackpots array
        setGameModalOpen(true);
    };

    if (!isAdmin) return <div className="p-8">Unauthorized</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 py-8">
                <div className="flex justify-between mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Games Manager</h1>
                    <button
                        onClick={() => { setGameForm({}); setGameModalOpen(true); }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                    >
                        Add New Game
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search Games..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full max-w-xs rounded-md border-gray-300 shadow-sm p-2 bg-white dark:bg-gray-700 dark:text-white border"
                    />
                </div>

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Game Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Jackpots Count</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {games.map((game) => (
                                <tr key={game.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{game.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        v{game.version} <br /> <span className="text-xs">Reno: {game.renoId}</span> <br />
                                        {game.isActive === false && <span className="text-red-500 text-xs font-bold">BLOCKED</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {game.jackpots?.filter((j: any) => j.isActive !== false).length || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        <button onClick={() => openEditGame(game)} className="text-indigo-600 hover:text-indigo-900 px-3">Edit / Jackpots</button>
                                        <button
                                            onClick={() => handleToggleStatus(game)}
                                            className={`${game.isActive !== false ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} px-3`}
                                        >
                                            {game.isActive !== false ? "Block" : "Unblock"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Game & Jackpot Modal */}
            {gameModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            {gameForm.id ? "Manage Game Jackpots" : "Add New Game"}
                        </h2>

                        {/* Game Details Form */}
                        <form onSubmit={handleSaveGame} className="space-y-4 border-b pb-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!!gameForm.id} // Disable if existing game
                                        value={gameForm.name || ""}
                                        onChange={e => setGameForm({ ...gameForm, name: e.target.value })}
                                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border ${gameForm.id ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-600 dark:text-white'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Version</label>
                                    <input
                                        type="text"
                                        disabled={!!gameForm.id} // Disable if existing game
                                        value={gameForm.version || ""}
                                        onChange={e => setGameForm({ ...gameForm, version: e.target.value })}
                                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border ${gameForm.id ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-600 dark:text-white'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reno ID</label>
                                    <input
                                        type="text"
                                        disabled={!!gameForm.id} // Disable if existing game
                                        value={gameForm.renoId || ""}
                                        onChange={e => setGameForm({ ...gameForm, renoId: e.target.value })}
                                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border ${gameForm.id ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-600 dark:text-white'}`}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                {!gameForm.id && (
                                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Game</button>
                                )}
                            </div>
                        </form>

                        {/* Jackpots Section - Only for existing games */}
                        {gameForm.id ? (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Jackpot Configuration</h3>
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4 grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Controller</label>
                                        <select
                                            value={jackpotForm.controllerId || ""}
                                            onChange={e => setJackpotForm({ ...jackpotForm, controllerId: e.target.value })}
                                            className="w-full rounded border p-1 text-sm bg-white dark:bg-gray-600 dark:text-white"
                                        >
                                            <option value="">Select Controller...</option>
                                            {controllers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} {c.version ? `(${c.version})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Grand (€)</label>
                                        <input type="number" step="0.01" value={jackpotForm.initialGrand || ""} onChange={e => setJackpotForm({ ...jackpotForm, initialGrand: e.target.value })} className="w-full rounded border p-1 text-sm bg-white dark:bg-gray-600 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Major (€)</label>
                                        <input type="number" step="0.01" value={jackpotForm.initialMajor || ""} onChange={e => setJackpotForm({ ...jackpotForm, initialMajor: e.target.value })} className="w-full rounded border p-1 text-sm bg-white dark:bg-gray-600 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Min/Max Bet (€)</label>
                                        <div className="flex gap-1">
                                            <input type="number" step="0.01" placeholder="Min" value={jackpotForm.minBet || ""} onChange={e => setJackpotForm({ ...jackpotForm, minBet: e.target.value })} className="w-1/2 rounded border p-1 text-sm bg-white dark:bg-gray-600 dark:text-white" />
                                            <input type="number" step="0.01" placeholder="Max" value={jackpotForm.maxBet || ""} onChange={e => setJackpotForm({ ...jackpotForm, maxBet: e.target.value })} className="w-1/2 rounded border p-1 text-sm bg-white dark:bg-gray-600 dark:text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <button onClick={handleAddJackpot} className="w-full bg-green-600 text-white py-1 rounded text-sm hover:bg-green-700">Add</button>
                                    </div>
                                </div>

                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                    <thead className="bg-gray-100 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300">Controller</th>
                                            <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300">Start Grand</th>
                                            <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300">Start Major</th>
                                            <th className="px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-300">Bet Range</th>
                                            <th className="px-3 py-2 text-right text-xs text-gray-500 dark:text-gray-300">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                                        {gameForm.jackpots && gameForm.jackpots.map((j: any) => (
                                            <tr key={j.id} className={j.isActive === false ? "bg-red-50 dark:bg-red-900/10" : ""}>
                                                <td className="px-3 py-2 dark:text-gray-300">
                                                    {j.controller?.name} <span className="text-gray-500 text-xs">{j.controller?.version}</span>
                                                    {j.isActive === false && <span className="block text-red-500 text-[10px] font-bold">BLOCKED</span>}
                                                </td>
                                                <td className="px-3 py-2 dark:text-gray-300">€{j.initialGrand}</td>
                                                <td className="px-3 py-2 dark:text-gray-300">€{j.initialMajor}</td>
                                                <td className="px-3 py-2 dark:text-gray-300">€{j.minBet} - €{j.maxBet}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        onClick={() => handleToggleJackpotStatus(j.id, j.isActive)}
                                                        className={`${j.isActive === false ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}
                                                    >
                                                        {j.isActive === false ? "Unblock" : "Block"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!gameForm.jackpots || gameForm.jackpots.length === 0) && (
                                            <tr><td colSpan={5} className="p-4 text-center text-gray-500">No jackpots configured.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">Save the game first to add jackpots.</p>
                        )}

                        <div className="mt-8 pt-4 border-t flex justify-end">
                            <button onClick={() => setGameModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
