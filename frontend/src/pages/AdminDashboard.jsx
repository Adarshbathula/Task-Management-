import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../AuthContext";
import { fetchAdminTasks, fetchAdminUsers } from "../api/tasks";

function AdminDashboard() {
    const { role } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadAdminData() {
            setLoading(true);
            setError("");
            try {
                const [usersRes, tasksRes] = await Promise.all([
                    fetchAdminUsers(),
                    fetchAdminTasks(),
                ]);
                setUsers(usersRes);
                setTasks(tasksRes);
            } catch (e) {
                setError("Failed to load admin data. You may not have access.");
            } finally {
                setLoading(false);
            }
        }

        if (role === "admin") {
            loadAdminData();
        } else {
            setLoading(false);
        }
    }, [role]);

    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter((t) => t.status === "completed").length;
        const pending = tasks.filter((t) => t.status === "pending").length;
        const overdue = tasks.filter((t) => t.status === "overdue").length;
        return { total, completed, pending, overdue };
    }, [tasks]);

    const tasksCountByUser = useMemo(() => {
        return tasks.reduce((acc, t) => {
            const uid = t.user_id || "unknown";
            acc[uid] = (acc[uid] ?? 0) + 1;
            return acc;
        }, {});
    }, [tasks]);

    if (role !== "admin") {
        return (
            <div className="px-6 py-10">
                <h1 className="text-3xl font-bold text-white mb-2">Admin</h1>
                <p className="text-slate-300">You are not allowed to view this page.</p>
            </div>
        );
    }

    return (
        <div className="px-6 py-10">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-slate-300">Users and task overview across the whole system.</p>
            </div>

            {loading ? (
                <div className="text-slate-300">Loading...</div>
            ) : error ? (
                <div className="text-rose-200 border border-rose-700 bg-rose-900/20 rounded-lg p-4">
                    {error}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                            <p className="text-slate-300 text-sm">Users</p>
                            <p className="text-3xl font-bold text-white">{users.length}</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                            <p className="text-slate-300 text-sm">Total Tasks</p>
                            <p className="text-3xl font-bold text-white">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                            <p className="text-slate-300 text-sm">Completed</p>
                            <p className="text-3xl font-bold text-emerald-200">{stats.completed}</p>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                            <p className="text-slate-300 text-sm">Overdue</p>
                            <p className="text-3xl font-bold text-rose-200">{stats.overdue}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
                        <div className="p-4 border-b border-slate-700">
                            <h2 className="text-white font-semibold">Users</h2>
                            <p className="text-slate-400 text-sm">
                                Includes role and the number of tasks per user.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-700">
                                <thead className="bg-slate-900/30">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Username</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Role</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300">Tasks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {users.map((u) => (
                                        <tr key={u.user_id} className="hover:bg-slate-900/20">
                                            <td className="px-4 py-3 text-sm text-white">{u.username}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{u.email}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span
                                                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                                        u.role === "admin"
                                                            ? "border-blue-700 bg-blue-900/30 text-blue-200"
                                                            : "border-slate-600 bg-slate-700/30 text-slate-200"
                                                    }`}
                                                >
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-200">
                                                {tasksCountByUser[u.user_id] ?? 0}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default AdminDashboard;

