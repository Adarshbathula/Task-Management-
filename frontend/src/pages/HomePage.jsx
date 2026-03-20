import { useEffect, useState } from "react";
import TaskList from "../components/TaskList";
import { useNavigate } from "react-router-dom";
import {
    fetchTasks as fetchTasksAPI,
    fetchTaskStats,
    fetchCompletedPerDay,
} from "../api/tasks";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";

function HomePage() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState(null);
    const [completedPerDay, setCompletedPerDay] = useState(null);

    useEffect(() => {
        async function getTasks() {
            try {
                const res = await fetchTasksAPI();
                setTasks(res);
            } catch (error) {
                console.error('Failed to fetch tasks:', error);
            }
        }
        getTasks();
    }, []);

    useEffect(() => {
        async function getDashboard() {
            try {
                const s = await fetchTaskStats();
                setStats(s);

                const chart = await fetchCompletedPerDay();
                setCompletedPerDay(chart);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            }
        }
        getDashboard();
    }, []);

    const deleteTask = (taskId) => {
        setTasks(tasks.filter(task => task._id !== taskId));
    };

    const updateTaskInState = (updatedTask) => {
        setTasks((prev) =>
            prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
        );
    };

    return (
        <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">My Tasks</h1>
                    <p className="text-slate-300">Create, complete and manage your daily tasks.</p>
                </div>
                <button
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md"
                    onClick={() => navigate("/tasks/new")}
                >
                    + New Task
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-slate-300 text-sm">Total</p>
                    <p className="text-3xl font-bold text-white">{stats?.total ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-slate-300 text-sm">Completed</p>
                    <p className="text-3xl font-bold text-emerald-200">{stats?.completed ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-slate-300 text-sm">Pending</p>
                    <p className="text-3xl font-bold text-amber-200">{stats?.pending ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-slate-300 text-sm">Overdue</p>
                    <p className="text-3xl font-bold text-rose-200">{stats?.overdue ?? 0}</p>
                </div>
            </div>

            {/* Completed per day chart */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-white font-semibold">Completed this week</h2>
                    <p className="text-slate-400 text-sm">Last 7 days</p>
                </div>
                {completedPerDay ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                           data={(completedPerDay?.labels || []).map((label, idx) => ({
    label,
    count: completedPerDay.counts?.[idx] ?? 0,
}))}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip
                                contentStyle={{ background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}
                                labelStyle={{ color: "#cbd5e1" }}
                                itemStyle={{ color: "#e2e8f0" }}
                            />
                            <Bar dataKey="count" fill="#22c55e" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-slate-400 text-sm">Loading chart...</p>
                )}
            </div>

            <TaskList tasks={tasks} onDelete={deleteTask} onUpdateTask={updateTaskInState} />
        </div>
    );
}

export default HomePage;
