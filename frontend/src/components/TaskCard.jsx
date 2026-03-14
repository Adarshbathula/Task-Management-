import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteTask, updateTask } from '../api/tasks';

function TaskCard({ task, onDelete }) {
    const navigate = useNavigate();
    const [completed, setCompleted] = useState(Boolean(task.completed));

    const toggleCompleted = async () => {
        try {
            const res = await updateTask(task._id, { completed: !completed });
            console.log(res);
            setCompleted(!completed);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div
            className={`rounded-xl border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-slate-500 ${
                completed ? 'bg-green-900/70 border-green-600' : ''
            }`}
        >
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h2 className="font-bold text-xl text-white">
                        {task.title}
                    </h2>
                    {completed && (
                        <span className="inline-flex items-center mt-1 rounded-full bg-emerald-600/80 px-2 py-0.5 text-xs font-semibold text-white">
                            Completed
                        </span>
                    )}
                </div>
                <button
                    onClick={toggleCompleted}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
                >
                    {completed ? 'Mark as pending' : 'Mark as completed'}
                </button>
            </div>

            {task.description && (
                <p className="text-slate-300 text-sm">
                    {task.description}
                </p>
            )}

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
