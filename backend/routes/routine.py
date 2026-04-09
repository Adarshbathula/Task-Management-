from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from login.oauth import get_current_user
from models import (
    DailyTaskProgressUpdate,
    DailyTaskStatusUpdate,
    GoalPlan,
    StartFocusSessionRequest,
    StopFocusSessionRequest,
    RoutineTaskTemplate,
    TokenData,
)
from routine_db import (
    create_goal_plan,
    detect_failure_and_suggestions,
    delete_daily_task,
    get_active_focus_session,
    get_focus_stats,
    get_or_create_daily_log,
    get_pending_reminders,
    get_progress_analytics,
    get_routine_template,
    list_goal_plans,
    start_focus_session,
    stop_focus_session,
    update_daily_task_status,
    update_daily_task_progress,
    upsert_routine_template,
)
from socket_server import emit_user_event


routine = APIRouter(prefix="/api/routines", tags=["routines"])


class RoutineTemplateRequest(BaseModel):
    tasks: List[RoutineTaskTemplate]


@routine.get("/template")
async def read_template(current_user: TokenData = Depends(get_current_user)):
    template = await get_routine_template(current_user.user_id)
    return template or {"user_id": current_user.user_id, "tasks": []}


@routine.put("/template")
async def save_template(
    request: RoutineTemplateRequest,
    current_user: TokenData = Depends(get_current_user),
):
    template = await upsert_routine_template(current_user.user_id, request.tasks)
    await emit_user_event(
        current_user.user_id,
        "routine_template_updated",
        {"count": len(template.tasks), "updated_at": template.updated_at.isoformat()},
    )
    return template


@routine.get("/daily")
async def today_daily_log(
    target_date: Optional[date] = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
):
    return await get_or_create_daily_log(current_user.user_id, target_date)


@routine.patch("/daily/{task_id}")
async def update_daily_status(
    task_id: str,
    body: DailyTaskStatusUpdate,
    target_date: Optional[date] = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
):
    day = target_date or date.today()
    updated = await update_daily_task_status(current_user.user_id, day, task_id, body.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found in daily log")
    await emit_user_event(
        current_user.user_id,
        "daily_task_updated",
        {"task_id": task_id, "status": body.status, "date": day.isoformat()},
    )
    return updated


@routine.patch("/daily/{task_id}/progress")
async def update_daily_progress(
    task_id: str,
    body: DailyTaskProgressUpdate,
    target_date: Optional[date] = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
):
    day = target_date or date.today()
    updated = await update_daily_task_progress(current_user.user_id, day, task_id, body.progress)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found in daily log")
    await emit_user_event(
        current_user.user_id,
        "daily_task_progress_updated",
        {"task_id": task_id, "progress": body.progress, "date": day.isoformat()},
    )
    return updated


@routine.delete("/daily/{task_id}")
async def remove_daily_task(
    task_id: str,
    target_date: Optional[date] = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
):
    day = target_date or date.today()
    updated = await delete_daily_task(current_user.user_id, day, task_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found in daily log")
    await emit_user_event(
        current_user.user_id,
        "daily_task_deleted",
        {"task_id": task_id, "date": day.isoformat()},
    )
    return updated


@routine.get("/reminders")
async def reminders(
    target_date: Optional[date] = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
):
    reminders_list = await get_pending_reminders(current_user.user_id, target_date)
    if reminders_list:
        await emit_user_event(
            current_user.user_id,
            "pending_reminders",
            {"count": len(reminders_list), "tasks": reminders_list},
        )
    return {"date": (target_date or date.today()).isoformat(), "tasks": reminders_list}


@routine.get("/analytics")
async def routine_analytics(
    target_date: Optional[date] = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
):
    return await get_progress_analytics(current_user.user_id, target_date)


@routine.get("/failure-insights")
async def failure_insights(
    target_date: Optional[date] = Query(default=None),
    current_user: TokenData = Depends(get_current_user),
):
    return await detect_failure_and_suggestions(current_user.user_id, target_date)


@routine.post("/goals")
async def create_goal(goal: GoalPlan, current_user: TokenData = Depends(get_current_user)):
    return await create_goal_plan(current_user.user_id, goal)


@routine.get("/goals")
async def get_goals(current_user: TokenData = Depends(get_current_user)):
    return await list_goal_plans(current_user.user_id)


@routine.post("/focus/start")
async def focus_start(
    body: StartFocusSessionRequest,
    current_user: TokenData = Depends(get_current_user),
):
    session = await start_focus_session(
        current_user.user_id,
        task_id=body.task_id,
        target_minutes=body.target_minutes,
    )
    await emit_user_event(
        current_user.user_id,
        "focus_session_started",
        {"session_id": str(session.id), "target_minutes": session.target_minutes},
    )
    return session


@routine.post("/focus/{session_id}/stop")
async def focus_stop(
    session_id: str,
    body: Optional[StopFocusSessionRequest] = None,
    current_user: TokenData = Depends(get_current_user),
):
    ended_at = body.ended_at if body else None
    session = await stop_focus_session(current_user.user_id, session_id, ended_at)
    if not session:
        raise HTTPException(status_code=404, detail="Focus session not found")
    await emit_user_event(
        current_user.user_id,
        "focus_session_stopped",
        {"session_id": str(session.id), "duration_seconds": session.duration_seconds},
    )
    return session


@routine.get("/focus/active")
async def focus_active(current_user: TokenData = Depends(get_current_user)):
    session = await get_active_focus_session(current_user.user_id)
    return session or {"active": False}


@routine.get("/focus/stats")
async def focus_stats(days: int = Query(default=7, ge=1, le=60), current_user: TokenData = Depends(get_current_user)):
    return await get_focus_stats(current_user.user_id, days)
