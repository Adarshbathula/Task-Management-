import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom";
import { fetchTask, createTask, updateTask, deleteTask } from "../api/tasks";


function TaskForm() {
    const navigate = useNavigate()
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium'); // high / medium / low
    const [dueDate, setDueDate] = useState(''); // YYYY-MM-DD
    const [status, setStatus] = useState('pending'); // pending / completed / overdue (overdue is derived)
    const params = useParams();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                title,
                description,
                priority,
                due_date: dueDate ? dueDate : null,
                status,
            };

            if (!params.id) {
                await createTask(payload);
            } else {
                await updateTask(params.id, payload);
            }
            navigate(`/`);
        } catch (error) {
            console.log(error)
        }
        e.target.reset();
    };

    useEffect(() => {

        if (params.id) {
            fetchTask(params.id)
                .then(res => {
                    setTitle(res.title)
                    setDescription(res.description)
                    setPriority(res.priority ?? 'medium')
                    setDueDate(res.due_date ?? '')
                    setStatus(res.status === 'overdue' ? 'pending' : (res.status ?? 'pending'))
                })
                .catch(err => console.log(err));
        }
    }, []);

    return (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
            <form className="bg-zinc-950 p-10 w-full max-w-xl" onSubmit={handleSubmit}>
                <h1 className="text-3xl font-bold my-4">
                    {params.id ? "Update Task" : "Create Task"}
                </h1>
                <input
                    type="text"
                    placeholder="title"
                    className="block py-2 px-3 mb-4 w-full text-black"
                    onChange={(e) => setTitle(e.target.value)}
                    value={title}
                    autoFocus
                />
                <textarea
                    placeholder="description"
                    rows="3"
                    className="block py-2 px-3 mb-4 w-full text-black"
                    onChange={(e) => setDescription(e.target.value)}
                    value={description}
                ></textarea>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">
                            Priority
                        </label>
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="block w-full py-2 px-3 rounded-md text-black"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">
                            Due date
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="block w-full py-2 px-3 rounded-md text-black"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                        Status
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="block w-full py-2 px-3 rounded-md text-black"
                    >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                        Overdue is derived automatically from due date.
                    </p>
                </div>

                <button className="
                bg-green-500 
                hover:bg-green-700 
                text-white font-bold py-1 px-2 rounded"
                >
                    {params.id ? "Update Task" : "Create Task"}
                </button>
                {
                    params.id && (
                        <button
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 ml-5 rounded"
                            onClick={async () => {
                                try {
                                    await deleteTask(params.id);
                                    navigate('/');
                                } catch (error) {
                                    console.log(error)
                                }
                            }}
                        >
                            Delete
                        </button>
                    )
                }
            </form>

        </div>
    )
}

export default TaskForm