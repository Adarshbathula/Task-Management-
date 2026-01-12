import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/register", form);
      alert("Registration successful");
      navigate("/login");
    } catch (err) {
      alert("Registration failed");
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded-xl shadow-md w-96"
      >
        <h2 className="text-2xl bg-blue-600 font-bold text-center mb-6">Register</h2>

        <input
          type="text"
          name="username"
          placeholder="Username"
          required
          onChange={handleChange}
          className="w-full p-2 border rounded mb-4 text-black placeholder-gray-600 bg-white"
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          onChange={handleChange}
          className="w-full p-2 border rounded mb-4 text-black placeholder-gray-600 bg-white"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          onChange={handleChange}
          className="w-full p-2 border rounded mb-4 text-black placeholder-gray-600 bg-white"
        />

        <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Register
        </button>
      </form>
    </div>
  );
};
export default Register;