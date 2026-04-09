import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import TaskList from "../components/TaskList";
import { useNavigate } from "react-router-dom";
import {
    API_URL,
    createTask,
    fetchTasks as fetchTasksAPI,
    fetchTaskStats,
    fetchCompletedPerDay,
    fetchRoutineReminders,
    parseTaskFromText,
    parseTaskFromVoiceText,
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
    const [aiTaskInput, setAiTaskInput] = useState("");
    const [isVoiceListening, setIsVoiceListening] = useState(false);
    const [aiMessage, setAiMessage] = useState("");
    const [reminders, setReminders] = useState([]);

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

    useEffect(() => {
        async function loadReminders() {
            try {
                const res = await fetchRoutineReminders();
                setReminders(res?.tasks || []);
            } catch (error) {
                console.error("Failed to fetch reminders:", error);
            }
        }
        loadReminders();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("jwt");
        if (!token) return;

        let userId = "";
        try {
            const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
            userId = payload.user_id;
        } catch {
            userId = "";
        }

        const socket = io(API_URL, {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            auth: { user_id: userId },
        });

        socket.on("pending_reminders", (msg) => {
            setReminders(msg?.tasks || []);
        });

        return () => socket.disconnect();
    }, []);

    const refreshDashboardStats = async () => {
        try {
            const s = await fetchTaskStats();
            setStats(s);
            const chart = await fetchCompletedPerDay();
            setCompletedPerDay(chart);
        } catch (error) {
            console.error("Failed to refresh dashboard data:", error);
        }
    };

    const mapParsedRoutineTaskToTaskPayload = (parsedTask) => ({
        title: parsedTask?.title || "New Task",
        description: "",
        priority: parsedTask?.priority || "medium",
        due_date: null,
        status: "pending",
    });

    const createTaskFromParsed = async (parsedTask) => {
        const payload = mapParsedRoutineTaskToTaskPayload(parsedTask);
        const created = await createTask(payload);
        setTasks((prev) => [...prev, created]);
        await refreshDashboardStats();
    };

    const createTaskFromAiText = async () => {
        if (!aiTaskInput.trim()) return;
        setAiMessage("");
        try {
            const parsed = await parseTaskFromText(aiTaskInput.trim());
            await createTaskFromParsed(parsed);
            setAiTaskInput("");
            setAiMessage("Task created from AI input.");
        } catch (error) {
            console.error("Failed to create AI task:", error);
            setAiMessage("Failed to create task from AI input.");
        }
    };

    const createTaskFromVoice = async () => {
        if (isVoiceListening) return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setAiMessage("Voice recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.lang = "en-US";

        setIsVoiceListening(true);
        setAiMessage("");

        recognition.onresult = async (event) => {
            const result = event.results[event.resultIndex];
            if (!result || !result.isFinal) return;
            const transcript = (result[0]?.transcript || "").trim();
            if (!transcript) return;

            try {
                const parsed = await parseTaskFromVoiceText(transcript);
                await createTaskFromParsed(parsed?.task || parsed);
                setAiMessage(`Voice task created: "${transcript}"`);
            } catch (error) {
                console.error("Failed to create voice task:", error);
                setAiMessage("Failed to create task from voice input.");
            }
        };

        recognition.onerror = () => {
            setIsVoiceListening(false);
            setAiMessage("Voice recognition error.");
        };

        recognition.onend = () => {
            setIsVoiceListening(false);
        };

        recognition.start();
    };

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
                <div className="flex items-center gap-2">
                    <button
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md"
                        onClick={() => navigate("/tasks/new")}
                    >
                        + New Task
                    </button>
                    <button
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-md"
                        onClick={createTaskFromVoice}
                    >
                        {isVoiceListening ? "Listening..." : "Mic"}
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 mb-6">
                <h2 className="text-white font-semibold mb-2">AI Task Input</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        value={aiTaskInput}
                        onChange={(e) => setAiTaskInput(e.target.value)}
                        placeholder='Example: "Practice DSA at 6pm for 1 hour"'
                        className="w-full rounded-md bg-slate-700 text-white px-3 py-2"
                    />
                    <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md"
                        onClick={createTaskFromAiText}
                    >
                        Create With AI
                    </button>
                </div>
                {aiMessage && <p className="text-sm text-slate-300 mt-2">{aiMessage}</p>}
            </div>

            <div className="rounded-xl border border-amber-700/50 bg-amber-900/10 p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-amber-200 font-semibold">Reminders</h2>
                    <span className="text-xs text-amber-300">{reminders.length} pending</span>
                </div>
                {reminders.length === 0 ? (
                    <p className="text-sm text-slate-300">No pending reminders right now.</p>
                ) : (
                    <div className="space-y-2">
                        {reminders.slice(0, 5).map((r, idx) => (
                            <div key={`${r.task_id || r.title}-${idx}`} className="rounded-md border border-amber-700/40 bg-slate-800/70 p-2">
                                <p className="text-sm text-white">{r.time || "--:--"} - {r.title}</p>
                                {r.goal && <p className="text-xs text-slate-300">{r.goal}</p>}
                            </div>
                        ))}
                    </div>
                )}
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
