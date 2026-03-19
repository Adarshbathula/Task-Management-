import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteTask, updateTask } from '../api/tasks';

function TaskCard({ task, onDelete, onUpdateTask }) {
    const navigate = useNavigate();
    const [localStatus, setLocalStatus] = useState(task.status ?? 'pending');

    const priority = task.priority ?? 'medium';
    const isCompleted = localStatus === 'completed';
    const isOverdue = localStatus === 'overdue';

    const priorityBadge =
        priority === 'high'
            ? 'bg-red-900/40 border-red-700 text-red-200'
            : priority === 'low'
                ? 'bg-emerald-900/40 border-emerald-700 text-emerald-200'
                : 'bg-amber-900/40 border-amber-700 text-amber-200';

    const statusBadge =
        isCompleted
            ? 'bg-green-900/40 border-green-700 text-green-200'
            : isOverdue
                ? 'bg-rose-900/40 border-rose-700 text-rose-200'
                : 'bg-slate-700/60 border-slate-500 text-slate-200';

    const toggleCompleted = async () => {
        try {
            const nextStatus = isCompleted ? 'pending' : 'completed';
            const res = await updateTask(task._id, { status: nextStatus });
            setLocalStatus(res.status ?? nextStatus);
            onUpdateTask?.(res);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div
            className={`rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-slate-500 ${
                isCompleted ? 'bg-green-900/30 border-green-700/60' : ''
            }`}
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h2 className="font-bold text-xl text-white">
                        {task.title}
                    </h2>
                </div>
                <button
                    onClick={toggleCompleted}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
                >
                    {isCompleted ? 'Mark as pending' : 'Mark as completed'}
                </button>
            </div>

            {task.description && (
                <p className="text-slate-300 text-sm">
                    {task.description}
                </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityBadge}`}
                >
                    {priority.toUpperCase()} Priority
                </span>
                <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge}`}
                >
                    {localStatus.charAt(0).toUpperCase() + localStatus.slice(1)}
                </span>
                {task.due_date && (
                    <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-700/40 px-2 py-0.5 text-xs font-semibold text-slate-200">
                        Due: {task.due_date}
                    </span>
                )}
            </div>

            <div className="mt-4 flex gap-3">
                <button
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-1.5 px-3 rounded-md"
                    onClick={() => {
                        navigate(`/tasks/${task._id}`);
                    }}
                >
                    Edit
                </button>
                <button
                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-1.5 px-3 rounded-md"
                    onClick={async () => {
                        try {
                            await deleteTask(task._id);
                            onDelete(task._id);
                        } catch (error) {
                            console.log(error);
                        }
                    }}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

export default TaskCard;
