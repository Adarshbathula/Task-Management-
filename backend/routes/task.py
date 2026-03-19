from typing import List

from fastapi import APIRouter, HTTPException, Depends
from task_db import (
    get_all_tasks,
    create_task,
    get_one_task_title,
    get_one_task_id,
    delete_task,
    update_task,
    get_tasks_by_user,
    get_task_stats_by_user,
    get_completed_per_day_last_7_days,
)
from models import Task, UpdateTask, TokenData
from login.oauth import get_current_user, require_admin

task = APIRouter()


@task.get('/api/tasks', response_model=List[Task])
async def read_tasks_by_user(current_user: TokenData = Depends(get_current_user)):
    tasks = await get_tasks_by_user(current_user.user_id)
    return tasks


@task.get("/api/tasks/{user_id}", response_model=List[Task])
async def read_tasks_by_user(user_id: str):
    tasks = await get_tasks_by_user(user_id)
    return tasks


@task.get('/api/tasks/{id}', response_model=Task)
async def get_task(id: str):
    task = await get_one_task_id(id)
    if task:
        return task
    raise HTTPException(404, f'Task with id {id} not found')


@task.post('/api/tasks', response_model=Task)
async def save_task(task: Task, current_user: TokenData = Depends(get_current_user)):
    task_found = await get_one_task_title(current_user.user_id, task.title)
    if task_found:
        raise HTTPException(409, 'Task already exists')

    task_data = task.model_dump(by_alias=True, exclude={"id"})
    task_data['user_id'] = current_user.user_id

    response = await create_task(task_data)
    if response:
        return response
    raise HTTPException(400, 'Something went wrong')


@task.put('/api/tasks/{id}', response_model=Task)
async def put_task(id: str, task: UpdateTask):
    response = await update_task(id, task)
    if response:
        return response
    raise HTTPException(404, f'Task with id {id} not found')


@task.delete('/api/tasks/{id}')
async def remove_task(id: str):
    response = await delete_task(id)
    if response:
        return "Sucessfully deleted task"
    raise HTTPException(404, f'Task with id {id} not found')


@task.get("/api/tasks/stats")
async def task_stats(current_user: TokenData = Depends(get_current_user)):
    return await get_task_stats_by_user(current_user.user_id)


@task.get("/api/tasks/completed-per-day")
async def completed_per_day(current_user: TokenData = Depends(get_current_user)):
    return await get_completed_per_day_last_7_days(current_user.user_id)


@task.get("/admin/tasks", response_model=List[Task])
async def admin_all_tasks(_admin: TokenData = Depends(require_admin)):
    # Returns all tasks for all users (admin only)
    return await get_all_tasks()
