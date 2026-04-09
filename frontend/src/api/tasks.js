import axios from 'axios';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_URL = URL;

// ✅ Define endpoint FIRST before using it
const endpoint = '/api/tasks';

// ✅ Now create axiosInstance AFTER
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

export const fetchTaskStats = async () => {
    try {
        const response = await axiosInstance.get(`${endpoint}/stats`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            window.location.href = '/login';
        }
        console.error('Error fetching task stats:', error);
        throw error;
    }
};

export const fetchCompletedPerDay = async () => {
    try {
        const response = await axiosInstance.get(`${endpoint}/completed-per-day`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            window.location.href = '/login';
        }
        console.error('Error fetching completed per day:', error);
        throw error;
    }
};

export const fetchAdminUsers = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}/admin/users`);
        return response.data;
    } catch (error) {
        console.error('Error fetching admin users:', error);
        throw error;
    }
};

export const fetchAdminTasks = async () => {
    try {
        const response = await axiosInstance.get(`${API_URL}/admin/tasks`);
        return response.data;
    } catch (error) {
        console.error('Error fetching admin tasks:', error);
        throw error;
    }
};

export const fetchRoutineTemplate = async () => {
    const response = await axiosInstance.get('/api/routines/template');
    return response.data;
};

export const saveRoutineTemplate = async (tasks) => {
    const response = await axiosInstance.put('/api/routines/template', { tasks });
    return response.data;
};

export const fetchDailyRoutine = async (targetDate) => {
    const response = await axiosInstance.get('/api/routines/daily', {
        params: targetDate ? { target_date: targetDate } : {},
    });
    return response.data;
};

export const updateDailyRoutineTask = async (taskId, status, targetDate) => {
    const response = await axiosInstance.patch(`/api/routines/daily/${taskId}`, { status }, {
        params: targetDate ? { target_date: targetDate } : {},
    });
    return response.data;
};

export const deleteDailyRoutineTask = async (taskId, targetDate) => {
    const response = await axiosInstance.delete(`/api/routines/daily/${taskId}`, {
        params: targetDate ? { target_date: targetDate } : {},
    });
    return response.data;
};

export const updateDailyRoutineTaskProgress = async (taskId, progress, targetDate) => {
    const response = await axiosInstance.patch(`/api/routines/daily/${taskId}/progress`, { progress }, {
        params: targetDate ? { target_date: targetDate } : {},
    });
    return response.data;
};

export const fetchRoutineAnalytics = async () => {
    const response = await axiosInstance.get('/api/routines/analytics');
    return response.data;
};

export const fetchFailureInsights = async () => {
    const response = await axiosInstance.get('/api/routines/failure-insights');
    return response.data;
};

export const fetchRoutineReminders = async () => {
    const response = await axiosInstance.get('/api/routines/reminders');
    return response.data;
};

export const parseTaskFromText = async (text) => {
    const response = await axiosInstance.post('/api/ai/parse-task', { text });
    return response.data;
};

export const parseTaskFromVoiceText = async (text) => {
    const response = await axiosInstance.post('/api/ai/voice-task', { text });
    return response.data;
};

export const fetchAiSuggestions = async () => {
    const response = await axiosInstance.get('/api/ai/suggestions');
    return response.data;
};

export const createGoalPlan = async (payload) => {
    const response = await axiosInstance.post('/api/routines/goals', payload);
    return response.data;
};

export const fetchGoalPlans = async () => {
    const response = await axiosInstance.get('/api/routines/goals');
    return response.data;
};

export const startFocusSession = async (payload = {}) => {
    const response = await axiosInstance.post('/api/routines/focus/start', payload);
    return response.data;
};

export const stopFocusSession = async (sessionId) => {
    const response = await axiosInstance.post(`/api/routines/focus/${sessionId}/stop`, {});
    return response.data;
};

export const fetchActiveFocusSession = async () => {
    const response = await axiosInstance.get('/api/routines/focus/active');
    return response.data;
};

export const fetchFocusStats = async (days = 7) => {
    const response = await axiosInstance.get('/api/routines/focus/stats', { params: { days } });
    return response.data;
};
