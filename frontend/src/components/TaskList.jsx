import TaskCard from "../components/TaskCard";
import { useMemo, useState } from "react";

function TaskList({ tasks, onDelete, onUpdateTask }) {
    const [filter, setFilter] = useState("all");

    const filteredTasks = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isOverdue = (task) => {
            const status = task.status ?? 'pending';
            if (status === 'completed') return false;
            if (!task.due_date) return false;
            const due = new Date(`${task.due_date}T00:00:00`);
            if (Number.isNaN(due.getTime())) return false;
            return due < today;
        };

        return tasks.filter((task) => {
            const status = task.status ?? 'pending';
            if (filter === "all") return true;
            if (filter === "pending") return status === "pending" && !isOverdue(task);
            if (filter === "completed") return status === "completed";
            if (filter === "overdue") return status === "overdue" || isOverdue(task);
            return true;
        });
    }, [tasks, filter]);

    const filters = [
        { key: "all", label: "All" },
        { key: "pending", label: "Pending" },
        { key: "completed", label: "Completed" },
        { key: "overdue", label: "Overdue" },
    ];

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2 mb-5">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors ${
                            filter === f.key
                                ? "bg-green-500/20 border-green-500 text-green-100"
                                : "bg-slate-800/60 border-slate-600 text-slate-200 hover:bg-slate-700/60"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => (
                    <TaskCard
                        task={task}
                        key={task._id}
                        onDelete={onDelete}
                        onUpdateTask={onUpdateTask}
                    />
                ))}
            </div>
        </div>
    );
}

export default TaskList;
