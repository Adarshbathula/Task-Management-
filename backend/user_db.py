from fastapi import FastAPI, HTTPException, Depends, Request, status
from motor.motor_asyncio import AsyncIOMotorClient
from login.jwttoken import create_access_token, ALGORITHM, SECRET_KEY
from bson import ObjectId
from login.oauth import oauth2_scheme
from models import User, Login, Token, TokenData
from decouple import config
from login.hashing import Hash

client = AsyncIOMotorClient(config('DB_URL'))
database = client.usersdatabase
collection = database.users



async def create_user(request: User):
    hashed_pass = Hash.bcrypt(request.password)
    user_object = request.dict()
    user_object["password"] = hashed_pass
    user = await collection.insert_one(user_object)
    return {"message": "User created successfully", "user_id": str(user.inserted_id)}


async def login(request: Request, login_data: Login):
    username = login_data.username
    password = login_data.password

    user = await collection.find_one({"username": username})

    if not user or not Hash.verify(user["password"], password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    access_token = create_access_token(data={
        "sub": user["username"],
        "user_id": str(user["_id"])
    })
    return {"access_token": access_token, "token_type": "bearer"}


def get_user_by_id(user_id: str) -> User:
    user_data = collection.find_one({"_id": ObjectId(user_id)})
    if user_data:
        user = User(**user_data)
        return user
    return None



