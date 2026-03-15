from fastapi import FastAPI
from routes.task import task
from routes.user import auth
from fastapi.middleware.cors import CORSMiddleware
from decouple import config

app = FastAPI()

# CORS: allow frontend (required when using credentials)
FRONTEND_URL = config("FRONTEND_URL", default="https://task-management-beta-puce.vercel.app")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
def welcome():
    return {'message': 'Welcome to the my FastAPI API'}


app.include_router(task)
app.include_router(auth)
