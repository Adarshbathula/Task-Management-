import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { API_URL } from "../api/tasks";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      // Useful when debugging production: confirm the request URL being called.
      // eslint-disable-next-line no-console
      console.log("Register POST URL:", `${API_URL}/register`);
      await axios.post(`${API_URL}/register`, form);
      setMessage("Account created successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const status = err?.response?.status;
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Unknown error";
      const statusPart = status ? ` (${status})` : "";
      setMessage(`Registration failed${statusPart}: ${detail}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Create account
        </h1>
        <p className="text-slate-300 text-center mb-6">
          Sign up to start managing your tasks.
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-200 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              placeholder="Choose a username"
              required
              onChange={handleChange}
              className="w-full py-2 px-3 rounded-md bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              onChange={handleChange}
              className="w-full py-2 px-3 rounded-md bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Create a password"
              required
              onChange={handleChange}
              className="w-full py-2 px-3 rounded-md bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {message && (
            <p className="text-sm text-center text-slate-200">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 transition-colors text-white font-semibold py-2 rounded-md mt-2"
          >
            Register
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-300 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-green-400 hover:text-green-300 font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;