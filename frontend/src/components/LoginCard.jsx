import axios from "axios";
import { useState, useContext } from "react"
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { API_URL } from '../api/tasks';

function LoginCard() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await axios.post(`${API_URL}/login`, {
                username: username,
                password: password
            });
            const token = response.data?.token?.access_token ?? response.data?.access_token;
            if (token) {
                login(token);
                navigate('/');
            } else {
                setMessage('Invalid response from server');
            }
        } catch (error) {
            setMessage('Invalid username or password');
            console.error(error);
        }
    };

    return ( 
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-white text-center mb-2">
                    Tasks App
                </h1>
                <p className="text-slate-300 text-center mb-6">
                    Sign in to manage your tasks
                </p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-slate-200 mb-1">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Enter your username"
                            className="block w-full py-2 px-3 rounded-md bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            onChange={(e) => setUsername(e.target.value)}
                            value={username}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            className="block w-full py-2 px-3 rounded-md bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                        />
                    </div>

                    {message && (
                        <p className="text-red-400 text-sm text-center">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-600 transition-colors text-white font-semibold py-2 rounded-md mt-2"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginCard;