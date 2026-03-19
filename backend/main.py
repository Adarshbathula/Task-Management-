from fastapi import FastAPI
from routes.task import task
from routes.user import auth
from fastapi.middleware.cors import CORSMiddleware
from decouple import config

app = FastAPI()

# CORS: allow only the Vercel frontend (required when using credentials)
# Note: we strip any trailing slash to avoid origin mismatches.
FRONTEND_URL = config(
    "FRONTEND_URL",
    default="https://task-management-beta-puce.vercel.app",
).rstrip("/")

LOCAL_DEV_URLS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://0.0.0.0:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, *LOCAL_DEV_URLS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

@app.get('/')
def welcome():
    return {'message': 'Welcome to the my FastAPI API'}


app.include_router(task)
app.include_router(auth)
