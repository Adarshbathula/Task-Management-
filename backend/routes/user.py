from fastapi import APIRouter, HTTPException, Depends, Request
from user_db import create_user, login, get_all_users_public
from models import User, Login, TokenData
from login.oauth import require_admin

auth = APIRouter()


@auth.post('/register')
async def register(request:User):
    new_user = await create_user(request)
    return new_user


@auth.post('/login')
async def log(request: Request, login_data: Login):
    token = await login(request, login_data)
    return {"token": token}


@auth.get("/admin/users")
async def admin_users(_admin: TokenData = Depends(require_admin)):
    return await get_all_users_public()
