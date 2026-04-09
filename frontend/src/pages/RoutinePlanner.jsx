import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  API_URL,
  deleteDailyRoutineTask,
  fetchActiveFocusSession,
  fetchAiSuggestions,
  fetchDailyRoutine,
  fetchFocusStats,
  fetchRoutineAnalytics,
  fetchRoutineReminders,
  fetchRoutineTemplate,
  parseTaskFromText,
  parseTaskFromVoiceText,
  saveRoutineTemplate,
  startFocusSession,
  stopFocusSession,
  updateDailyRoutineTask,
} from "../api/tasks";

function RoutinePlanner() {
  const [templateTasks, setTemplateTasks] = useState([]);
  const [dailyLog, setDailyLog] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [nlInput, setNlInput] = useState("");
  const [focusActive, setFocusActive] = useState(null);
  const [focusStats, setFocusStatsState] = useState(null);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualTask, setManualTask] = useState({
    title: "",
    time: "06:00",
    goal: "",
    priority: "medium",
  });
  const [isListening, setIsListening] = useState(false);
  const lastVoiceTranscriptRef = useRef("");
  const [pendingVoiceTask, setPendingVoiceTask] = useState(null);
  const [pendingVoiceText, setPendingVoiceText] = useState("");

  const weeklyData = useMemo(() => analytics?.weekly ?? [], [analytics]);
  const monthlyData = useMemo(() => (analytics?.monthly ?? []).slice(-12), [analytics]);
  const templateCardPalette = [
    "bg-emerald-100/90 text-slate-900 border-emerald-200",
    "bg-violet-100/90 text-slate-900 border-violet-200",
    "bg-amber-100/90 text-slate-900 border-amber-200",
    "bg-sky-100/90 text-slate-900 border-sky-200",
    "bg-lime-100/90 text-slate-900 border-lime-200",
  ];
  const displayCategory = (category) => {
    if (!category) return "";
    const normalized = String(category).toLowerCase();
    return normalized === "other" ? "" : ` (${category})`;
  };

  useEffect(() => {
    async function load() {
      const [template, daily, analyticsRes, reminders, activeFocus, focusStatRes] = await Promise.all([
        fetchRoutineTemplate(),
        fetchDailyRoutine(),
        fetchRoutineAnalytics(),
        fetchRoutineReminders(),
        fetchActiveFocusSession(),
        fetchFocusStats(7),
      ]);
      setTemplateTasks(template.tasks || []);
      setDailyLog(daily);
      setAnalytics(analyticsRes);
      if (activeFocus?.user_id) {
        setFocusActive(activeFocus);
      }
      setFocusStatsState(focusStatRes);
      if (reminders?.tasks?.length) {
        setAlerts((prev) => [...reminders.tasks.map((t) => `Pending now: ${t.title}`), ...prev].slice(0, 6));
      }
    }
    load().catch(console.error);
  }, []);

  useEffect(() => {
    if (!focusActive?.started_at) return;
    const tick = () => {
      const started = new Date(focusActive.started_at).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [focusActive]);

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
      const taskNames = (msg?.tasks || []).map((t) => t.title).join(", ");
      if (taskNames) setAlerts((prev) => [`Reminder: ${taskNames}`, ...prev].slice(0, 6));
    });

    socket.on("daily_task_updated", (msg) => {
      setAlerts((prev) => [`Task updated: ${msg?.task_id} -> ${msg?.status}`, ...prev].slice(0, 6));
    });

    socket.on("focus_session_started", (msg) => {
      setAlerts((prev) => [`Focus started (${msg?.target_minutes}m)`, ...prev].slice(0, 6));
    });

    socket.on("focus_session_stopped", (msg) => {
      setAlerts((prev) => [`Focus ended (${Math.floor((msg?.duration_seconds || 0) / 60)}m)`, ...prev].slice(0, 6));
    });

    return () => socket.disconnect();
  }, []);

  const refreshDashboard = async () => {
    const [daily, analyticsRes, activeFocus, focusStatRes] = await Promise.all([
      fetchDailyRoutine(),
      fetchRoutineAnalytics(),
      fetchActiveFocusSession(),
      fetchFocusStats(7),
    ]);
    setDailyLog(daily);
    setAnalytics(analyticsRes);
    setFocusActive(activeFocus?.user_id ? activeFocus : null);
    setFocusStatsState(focusStatRes);
  };

  const addManualTask = () => {
    if (!manualTask.title || !manualTask.goal) return;
    setTemplateTasks((prev) => [...prev, { ...manualTask, category: "", status: "pending" }]);
    setManualTask({
      title: "",
      time: "06:00",
      goal: "",
      priority: "medium",
    });
  };

  const saveTemplate = async () => {
    await saveRoutineTemplate(templateTasks);
    await refreshDashboard();
    setAlerts((prev) => ["Routine template saved", ...prev].slice(0, 6));
  };

  const setTaskStatus = async (taskId, status) => {
    await updateDailyRoutineTask(taskId, status);
    await refreshDashboard();
  };

  const deleteTodayTask = async (taskId) => {
    await deleteDailyRoutineTask(taskId);
    await refreshDashboard();
    setAlerts((prev) => ["Task deleted from today", ...prev].slice(0, 6));
  };

  const removeTemplateTask = (index) => {
    setTemplateTasks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const parseNaturalLanguage = async () => {
    if (!nlInput.trim()) return;
    const parsed = await parseTaskFromText(nlInput.trim());
    setTemplateTasks((prev) => [...prev, { ...parsed, status: "pending" }]);
    setNlInput("");
  };

  const parseVoiceInput = async () => {
    if (isListening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAlerts((prev) => ["Voice recognition not supported in this browser", ...prev].slice(0, 6));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

    setIsListening(true);

    recognition.onresult = async (event) => {
      const result = event.results[event.resultIndex];
      if (!result || !result.isFinal) return;

      const transcript = (result[0]?.transcript || "").trim();
      if (!transcript) return;
      if (transcript.toLowerCase() === lastVoiceTranscriptRef.current.toLowerCase()) return;

      lastVoiceTranscriptRef.current = transcript;
      const parsed = await parseTaskFromVoiceText(transcript);
      setPendingVoiceTask(parsed.task);
      setPendingVoiceText(transcript);
      setAlerts((prev) => [`Voice captured. Confirm to add: "${transcript}"`, ...prev].slice(0, 6));
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const confirmVoiceTask = () => {
    if (!pendingVoiceTask) return;
    setTemplateTasks((prev) => [...prev, { ...pendingVoiceTask, status: "pending" }]);
    setAlerts((prev) => ["Voice task added to routine", ...prev].slice(0, 6));
    setPendingVoiceTask(null);
    setPendingVoiceText("");
  };

  const discardVoiceTask = () => {
    setPendingVoiceTask(null);
    setPendingVoiceText("");
  };

  const applyAiSuggestions = async () => {
    const res = await fetchAiSuggestions();
    const next = (res.tasks || []).map((t) => ({ ...t, status: "pending" }));
    setTemplateTasks((prev) => [...prev, ...next]);
  };

  const startFocus = async () => {
    const firstPending = (dailyLog?.tasks || []).find((t) => t.status === "pending");
    const session = await startFocusSession({
      task_id: firstPending?.task_id || null,
      target_minutes: focusMinutes,
    });
    setFocusActive(session);
    await refreshDashboard();
  };

  const endFocus = async () => {
    if (!focusActive?.id && !focusActive?._id) return;
    const id = focusActive.id || focusActive._id;
    await stopFocusSession(id);
    setFocusActive(null);
    setElapsedSeconds(0);
    await refreshDashboard();
  };

  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Smart Routine Planner</h1>
          <p className="text-slate-300">Create once, execute daily, and track productivity with AI + real-time updates.</p>
        </div>
        <button onClick={saveTemplate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-semibold">
          Save Routine
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-4">
          <h2 className="text-white font-semibold">AI Task Input</h2>
          <div className="flex gap-2">
            <input
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              placeholder='Example: "Practice DSA at 6pm for 1 hour"'
              className="w-full rounded-md bg-slate-700 text-white px-3 py-2"
            />
            <button onClick={parseNaturalLanguage} className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-md">Parse</button>
            <button onClick={parseVoiceInput} className="bg-violet-600 hover:bg-violet-700 text-white px-3 rounded-md">
              {isListening ? "Listening..." : "Voice"}
            </button>
          </div>
          <button onClick={applyAiSuggestions} className="text-sm rounded-md border border-slate-500 px-3 py-2 text-slate-200 hover:bg-slate-700">
            Apply AI Suggestions
          </button>
          {pendingVoiceTask && (
            <div className="rounded-md border border-cyan-500/40 bg-cyan-900/20 p-3 space-y-2">
              <p className="text-sm text-cyan-100">Voice Preview: "{pendingVoiceText}"</p>
              <p className="text-sm text-slate-100">
                {pendingVoiceTask.time} - {pendingVoiceTask.title}{displayCategory(pendingVoiceTask.category)} | {pendingVoiceTask.goal}
              </p>
              <div className="flex gap-2">
                <button onClick={confirmVoiceTask} className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-md text-sm">
                  Add Task
                </button>
                <button onClick={discardVoiceTask} className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-sm">
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <h2 className="text-white font-semibold mb-3">Live Alerts</h2>
          <ul className="space-y-2 text-sm text-slate-200">
            {alerts.length === 0 ? <li>No alerts yet</li> : alerts.map((alert, idx) => <li key={idx}>- {alert}</li>)}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
        <h2 className="text-white font-semibold mb-3">Routine Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <input className="rounded-md bg-slate-700 text-white px-3 py-2" placeholder="Title" value={manualTask.title} onChange={(e) => setManualTask({ ...manualTask, title: e.target.value })} />
          <input type="time" className="rounded-md bg-slate-700 text-white px-3 py-2" value={manualTask.time} onChange={(e) => setManualTask({ ...manualTask, time: e.target.value })} />
          <input className="rounded-md bg-slate-700 text-white px-3 py-2" placeholder="Goal (e.g. solve 2 problems)" value={manualTask.goal} onChange={(e) => setManualTask({ ...manualTask, goal: e.target.value })} />
          <button onClick={addManualTask} className="bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold">Add</button>
        </div>
        <div className="space-y-2">
          {templateTasks.map((task, idx) => (
            <div
              key={`${task.title}-${idx}`}
              className={`rounded-xl border p-3 flex items-center justify-between ${templateCardPalette[idx % templateCardPalette.length]}`}
            >
              <div>
                <p>{task.time} - {task.title}{displayCategory(task.category)}</p>
                <p className="text-xs text-slate-700">{task.goal} | Status: Pending</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-500 bg-white/60">
                  ○
                </span>
                <button
                  onClick={() => removeTemplateTask(idx)}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded-md text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <h2 className="text-white font-semibold mb-3">Today Checklist</h2>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {(dailyLog?.tasks || []).map((task) => (
              <div key={task.task_id} className="rounded-xl border border-slate-600 p-3 flex items-center justify-between bg-slate-700/40">
                <div>
                  <p className="text-white font-medium">{task.time} - {task.title}</p>
                  <p className="text-slate-300 text-sm">
                    {task.goal}{task.carried_over ? " (rescheduled)" : ""} | Status: {task.status || "pending"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTaskStatus(task.task_id, task.status === "completed" ? "pending" : "completed")}
                    className={`px-3 py-1 rounded-md text-sm text-white ${
                      task.status === "completed"
                        ? "bg-emerald-700 hover:bg-emerald-800"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {task.status === "completed" ? "Checked ✓" : "Check"}
                  </button>
                  <button
                    onClick={() => deleteTodayTask(task.task_id)}
                    className="px-3 py-1 rounded-md text-sm bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <h2 className="text-white font-semibold mb-3">Focus Mode</h2>
          <div className="space-y-3">
            <p className="text-slate-200 text-sm">
              {focusActive ? `In focus session: ${elapsedLabel}` : "No active focus session"}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-slate-300 text-sm">Minutes</label>
              <input
                type="number"
                min="5"
                max="180"
                value={focusMinutes}
                onChange={(e) => setFocusMinutes(Math.max(5, Math.min(180, Number(e.target.value) || 25)))}
                className="w-24 rounded-md bg-slate-700 text-white px-2 py-1"
              />
            </div>
            <div className="flex gap-2">
              {!focusActive && (
                <button onClick={startFocus} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-md">
                  Start Focus
                </button>
              )}
              {focusActive && (
                <button onClick={endFocus} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-md">
                  Stop Focus
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Last 7 days: {focusStats?.total_minutes ?? 0} minutes, {focusStats?.completed_sessions ?? 0} sessions.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-slate-300 text-sm">Daily Progress</p>
          <p className="text-3xl text-white font-bold">{analytics?.daily?.completion_percentage ?? 0}%</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-slate-300 text-sm">Current Streak</p>
          <p className="text-3xl text-amber-300 font-bold">{analytics?.streak_days ?? 0} days</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
          <p className="text-slate-300 text-sm">Tasks Today</p>
          <p className="text-3xl text-white font-bold">{analytics?.daily?.total ?? 0}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
        <h2 className="text-white font-semibold mb-3">Weekly Trend</h2>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {weeklyData.map((item) => (
            <div key={item.date} className="bg-slate-700 rounded-md p-2 text-center">
              <p className="text-xs text-slate-300">{item.date.slice(5)}</p>
              <p className="text-lg font-bold text-white">{item.completion_percentage}%</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
        <h2 className="text-white font-semibold mb-3">Monthly Trend (Last 12 Records)</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {monthlyData.map((item) => (
            <div key={item.date} className="bg-slate-700 rounded-md p-2 text-center">
              <p className="text-xs text-slate-300">{item.date.slice(8)}</p>
              <p className="text-sm font-bold text-white">{item.completion_percentage}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RoutinePlanner;
