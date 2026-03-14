import { useEffect, useState } from "react";
import TaskList from "../components/TaskList";
import { useNavigate } from "react-router-dom";
import { fetchTasks as fetchTasksAPI } from "../api/tasks";

function HomePage() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);

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

    const deleteTask = (taskId) => {
        setTasks(tasks.filter(task => task._id !== taskId));
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

            <TaskList tasks={tasks} onDelete={deleteTask} />
        </div>
    );
}

export default HomePage;
