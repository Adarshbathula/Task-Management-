from motor.motor_asyncio import AsyncIOMotorClient
from models import Task
from bson import ObjectId
from decouple import config


mongo_url = config("DB_URL", default=None) or config("MONGODB_URL")
client = AsyncIOMotorClient(mongo_url)

raw_db_name = config("TASKS_DB_NAME", default="taskdatabase")
database_name = raw_db_name.split()[0] if raw_db_name else "taskdatabase"
database = client[database_name]
collection = database.tasks

async def get_one_task_id(id):
    task = await collection.find_one({'_id': ObjectId(id)})
    return task

async def get_one_task_title(user_id: str , title: str):
    task = await collection.find_one({'user_id': user_id , 'title': title})
    return task

async def get_all_tasks():
    tasks = []
    cursor = collection.find({})
    async for document in cursor:
        tasks.append(Task(**document))
    return tasks

async def get_tasks_by_user(user_id: str):
    tasks = []
    async for document in collection.find({"user_id": user_id}):
        tasks.append(Task(**document))
    return tasks

async def create_task(task_data: dict):


    # Insertar la tarea en la colección de MongoDB
    new_task = await collection.insert_one(task_data)

    # Recuperar la tarea recién creada para devolverla como respuesta
    created_task = await collection.find_one({'_id': new_task.inserted_id})

    return created_task

async def update_task(id: str, data):
    task = {k:v for k,v in data.dict().items() if v is not None}
    await collection.update_one({'_id': ObjectId(id)}, {'$set': task})
    document = await collection.find_one({'_id': ObjectId(id)})
    return document

async def delete_task(id: str):
    await collection.delete_one({'_id':ObjectId(id)})
    return True