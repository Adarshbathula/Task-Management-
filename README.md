# 📋 Tasks App

A modern task management application with user authentication, built with a robust Python backend and an interactive React frontend.

---

## 🎯 Project Description

**Tasks App** is a complete solution for personal task management.  
Users can create, edit, delete, and mark tasks as completed through a secure authentication system.  
The app is designed with a client-server architecture, delivering a smooth and responsive experience.

---

## 🏗️ Architecture

The project is organized into two main folders:

### Backend (Python - FastAPI)

```text
backend/
├── main.py                      # Main FastAPI and CORS configuration
├── models.py                    # Data models (Task, User, Token)
├── task_db.py                   # CRUD operations for tasks with MongoDB
├── user_db.py                   # CRUD operations for users with MongoDB
├── requirements.txt             # Python dependencies
│
├── login/                       # Authentication and security module
│   ├── hashing.py               # Password hashing functions (Bcrypt)
│   ├── jwttoken.py              # JWT generation and validation
│   └── oauth.py                 # OAuth2 configuration and dependencies
│
└── routes/                      # API endpoints and routes
    ├── task.py                  # CRUD routes for tasks (GET, POST, PUT, DELETE)
    └── user.py                  # Authentication routes (register, login)
```

### Frontend (React + Vite)

```text
frontend/
├── public/                      # Public static files
│
├── src/
│   ├── App.jsx                  # Root component with routing
│   ├── AuthContext.jsx          # Context API for authentication management
│   ├── main.jsx                 # Application entry point
│   ├── index.css                # Global styles with Tailwind
│   │
│   ├── api/                     # HTTP client and services
│   │   └── tasks.js             # Functions for API calls (axios)
│   │
│   ├── components/              # Reusable components
│   │   ├── LoginCard.jsx        # Login form
│   │   ├── Navbar.jsx           # Navigation bar with menu
│   │   ├── TaskCard.jsx         # Individual task component
│   │   ├── TaskList.jsx         # Task list component
│   │   └── ProtectedRoute.jsx   # Component for protected routes
│   │
│   └── pages/                   # Application pages
│       ├── Login.jsx            # Authentication page
│       ├── HomePage.jsx         # Main page with task list
│       └── TaskForm.jsx
|       |__Register.jsx
       # Form for creating/editing tasks
│
├── index.html                   # Main HTML file
├── package.json                 # Node.js dependencies and scripts
├── package-lock.json            # npm lock file
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── postcss.config.js            # PostCSS configuration
```

---

## 🛠️ Technologies Used

### Backend
- **FastAPI** – Modern, high-performance web framework  
- **MongoDB** – Asynchronous NoSQL database engine  
- **Pydantic** – Data validation  
- **JWT (python-jose)** – Token-based authentication  
- **Bcrypt** – Secure password hashing  
- **Uvicorn** – ASGI server  

### Frontend
- **React 18** – User interface library  
- **Vite** – Build and development tool  
- **React Router DOM** – Client-side routing  
- **Tailwind CSS** – Utility-first CSS framework  
- **Axios** – HTTP client  
- **Redux** – Global state management  
- **Headless UI** – Unstyled accessible components  
- **Hero Icons** – SVG icon set  

---

## 🚀 Installation and Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn
- MongoDB running locally or a MongoDB Atlas cluster

### Backend Setup

1. Go to the backend folder:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables (create a `.env` file in the `backend/` folder):
```env
# Primary MongoDB connection string (Atlas or local)
DB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority

# Optional: alternative env name (used as fallback if DB_URL is not set)
MONGODB_URL=mongodb://localhost:27017

# Optional: override database names (defaults shown)
TASKS_DB_NAME=taskdatabase
USERS_DB_NAME=usersdatabase

SECRET_KEY=your_secret_key_here
```

5. Run the server:
```bash
uvicorn main:app --reload
```

The server will be available at `http://localhost:8000`

### Frontend Setup

1. Go to the frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

---

## 📖 Usage

### Authentication
- Register with a username, email, and password  
- Log in to obtain a JWT token  
- The token is used to authenticate all subsequent requests  

### Task Management
- **Create task**: Add new tasks with title and description  
- **List tasks**: View all your tasks  
- **Update task**: Edit title, description, or mark as completed  
- **Delete task**: Remove tasks you no longer need  

---

## 🔒 Security Features

- ✅ JWT authentication  
- ✅ Passwords hashed with Bcrypt  
- ✅ Email validation with Pydantic  
- ✅ CORS configured for development  
- ✅ Data validation on both client and server sides  

---

## 🔄 Application Flow

```text
User
   ↓
[React Interface] ←→ [FastAPI Backend] ←→ [MongoDB]
   ↓
Redux Store (State)
   ↓
React Components
```

---

## 🚧 API Route Structure

### Authentication
- `POST /auth/register` – Register new user  
- `POST /auth/login` – Log in  

### Tasks
- `GET /tasks` – Get all tasks  
- `POST /tasks` – Create new task  
- `GET /tasks/{id}` – Get specific task  
- `PUT /tasks/{id}` – Update task  
- `DELETE /tasks/{id}` – Delete task  

---

## 👨💻 Author

**AdarshBathula** – Full Stack Developer  

GitHub:[Adarshbathula/Task-Management](https://github.com/Adarshbathula/Task-Management-/tree/main)

---

⭐ If you like this project, consider giving it a star!
