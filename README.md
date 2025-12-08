# 📋 Tasks App

Una aplicación moderna de gestión de tareas con autenticación de usuarios, construida con un backend robusto en Python y un frontend interactivo en React.

---

## 🎯 Descripción del Proyecto

**Tasks App** es una solución completa para la gestión de tareas personales.  Los usuarios pueden crear, editar, eliminar y marcar tareas como completadas con un sistema de autenticación seguro.  La aplicación está diseñada con una arquitectura de cliente-servidor, proporcionando una experiencia fluida y receptiva.

---

## 🏗️ Arquitectura

El proyecto está organizado en dos carpetas principales:

### Backend (Python - FastAPI)
```
backend/
├── main.py                      # Configuración principal de FastAPI y CORS
├── models. py                    # Modelos de datos (Task, User, Token)
├── task_db.py                   # Operaciones CRUD para tareas en MongoDB
├── user_db.py                   # Operaciones CRUD para usuarios en MongoDB
├── requirements.txt             # Dependencias de Python
│
├── login/                        # Módulo de autenticación y seguridad
│   ├── hashing.py              # Funciones de hash de contraseñas (Bcrypt)
│   ├── jwttoken.py             # Generación y validación de JWT
│   └── oauth. py                # Configuración OAuth2 y dependencias
│
└── routes/                       # Endpoints y rutas de la API
    ├── task. py                 # Rutas CRUD para tareas (GET, POST, PUT, DELETE)
    └── user.py                 # Rutas de autenticación (registro, login)
```

### Frontend (React + Vite)
```
frontend/
├── public/                      # Archivos estáticos públicos
│
├── src/
│   ├── App.jsx                 # Componente raíz con enrutamiento
│   ├── AuthContext.jsx         # Context API para gestión de autenticación
│   ├── main.jsx                # Punto de entrada de la aplicación
│   ├── index.css               # Estilos globales con Tailwind
│   │
│   ├── api/                    # Cliente HTTP y servicios
│   │   └── tasks.js            # Funciones para llamadas a la API (axios)
│   │
│   ├── components/             # Componentes reutilizables
│   │   ├── LoginCard.jsx       # Formulario de login
│   │   ├── Navbar.jsx          # Barra de navegación con menú
│   │   ├── TaskCard.jsx        # Componente individual de tarea
│   │   ├── TaskList.jsx        # Listado de tareas
│   │   └── ProtectedRoute.jsx  # Componente para rutas protegidas
│   │
│   └── pages/                  # Páginas de la aplicación
│       ├── Login.jsx           # Página de autenticación
│       ├── HomePage.jsx        # Página principal con listado de tareas
│       └── TaskForm.jsx        # Formulario para crear/editar tareas
│
├── index.html                  # HTML principal
├── package.json                # Dependencias y scripts de Node.js
├── package-lock.json           # Lock file de npm
├── vite.config.js              # Configuración de Vite
├── tailwind.config.js          # Configuración de Tailwind CSS
└── postcss.config.js           # Configuración de PostCSS
```

---

## 🛠️ Tecnologías Utilizadas

### Backend
- **FastAPI** - Framework web moderno y rápido
- **MongoDB** (Motor) - Base de datos NoSQL asincrónica
- **Pydantic** - Validación de datos
- **JWT (python-jose)** - Autenticación basada en tokens
- **Bcrypt** - Hash seguro de contraseñas
- **Uvicorn** - Servidor ASGI

### Frontend
- **React 18** - Biblioteca de interfaz de usuario
- **Vite** - Herramienta de construcción y desarrollo
- **React Router DOM** - Enrutamiento de lado del cliente
- **Tailwind CSS** - Framework de CSS utilities
- **Axios** - Cliente HTTP
- **Redux** - Gestión de estado global
- **Headless UI** - Componentes sin estilos accesibles
- **Hero Icons** - Iconos SVG

---


## 🚀 Instalación y Configuración

### Requisitos Previos
- Python 3.8+
- Node.js 16+
- npm o yarn
- MongoDB ejecutándose localmente o en la nube

### Backend Setup

1. Navega a la carpeta backend:
```bash
cd backend
```

2. Crea un entorno virtual:
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. Instala las dependencias:
```bash
pip install -r requirements.txt
```

4. Configura las variables de entorno (crea un archivo `.env`):
```env
MONGODB_URL=mongodb://localhost:27017
SECRET_KEY=tu_clave_secreta_aqui
```

5. Inicia el servidor:
```bash
uvicorn main:app --reload
```

El servidor estará disponible en `http://localhost:8000`

### Frontend Setup

1. Navega a la carpeta frontend:
```bash
cd frontend
```

2.  Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 📖 Uso

### Autenticación
- Regístrate con un nombre de usuario, email y contraseña
- Inicia sesión para obtener un token JWT
- El token se usa para autenticar todas las solicitudes posteriores

### Gestión de Tareas
- **Crear tarea**: Añade nuevas tareas con título y descripción
- **Listar tareas**: Visualiza todas tus tareas
- **Actualizar tarea**: Edita el título, descripción o marca como completada
- **Eliminar tarea**: Borra tareas que no necesites

---

## 🔒 Características de Seguridad

- ✅ Autenticación con JWT
- ✅ Contraseñas hasheadas con Bcrypt
- ✅ Validación de email con Pydantic
- ✅ CORS configurado para desarrollo
- ✅ Validación de datos en ambos lados

---


## 🔄 Flujo de la Aplicación

```
Usuario
   ↓
[Interfaz React] ←→ [FastAPI Backend] ←→ [MongoDB]
   ↓
Redux Store (Estado)
   ↓
Componentes React
```

---

## 🚧 Estructura de Rutas API

### Autenticación
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión

### Tareas
- `GET /tasks` - Obtener todas las tareas
- `POST /tasks` - Crear nueva tarea
- `GET /tasks/{id}` - Obtener tarea específica
- `PUT /tasks/{id}` - Actualizar tarea
- `DELETE /tasks/{id}` - Eliminar tarea

---

## 👨‍💻 Autor

**MonforteGG** - Desarrollador Full Stack

GitHub: [@MonforteGG](https://github.com/MonforteGG)

---

⭐ Si te gusta este proyecto, considera darle una estrella! 
