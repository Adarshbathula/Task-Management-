// src/api/tasks.js
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const URL = 'https://task-management-ml9m.onrender.com';
const endpoint = `${URL}/api/tasks`;

// Configuración de Axios
const axiosInstance = axios.create({
    baseURL: URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor para agregar el token en cada solicitud
axiosInstance.interceptors.request.use(config => {
    const token = localStorage.getItem('jwt');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Funciones de solicitud reutilizando axiosInstance
export const fetchTasks = async () => {
    try {
        const response = await axiosInstance.get(endpoint);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            // Redirige al login si no está autenticado
            window.location.href = '/login'; 
        }
        console.error('Error fetching tasks:', error);
        throw error;
    }
};

export const fetchTask = async (id) => {
    try {
        const response = await axiosInstance.get(`${endpoint}/${id}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            window.location.href = '/login'; 
        }
        console.error(`Error fetching task with id ${id}:`, error);
        throw error;
    }
};

export const createTask = async (newTask) => {
    try {
        const response = await axiosInstance.post(endpoint, newTask);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            window.location.href = '/login'; 
        }
        console.error('Error creating task:', error);
        throw error;
    }
};

export const updateTask = async (id, updatedTask) => {
    try {
        const response = await axiosInstance.put(`${endpoint}/${id}`, updatedTask);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            window.location.href = '/login'; 
        }
        console.error(`Error updating task with id ${id}:`, error);
        throw error;
    }
};

export const deleteTask = async (id) => {
    try {
        const response = await axiosInstance.delete(`${endpoint}/${id}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            window.location.href = '/login'; 
        }
        console.error(`Error deleting task with id ${id}:`, error);
        throw error;
    }
};
