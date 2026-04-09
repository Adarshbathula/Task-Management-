from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from decouple import config
from motor.motor_asyncio import AsyncIOMotorClient

from models import DailyLog, DailyTask, FocusSession, GoalPlan, RoutineTaskTemplate, RoutineTemplate


mongo_url = config("DB_URL", default=None) or config("MONGODB_URL")
client = AsyncIOMotorClient(mongo_url)
database_name = config("TASKS_DB_NAME", default="taskdatabase")
database = client[database_name]

routine_collection = database.routine_templates
daily_logs_collection = database.daily_logs
goals_collection = database.goal_plans
focus_collection = database.focus_sessions


def _calc_completion_percentage(tasks: List[dict]) -> float:
    if not tasks:
        return 0.0
    completed = sum(1 for t in tasks if t.get("status") == "completed")
    return round((completed / len(tasks)) * 100, 2)


def _template_task_to_daily_task(task: RoutineTaskTemplate, carried_over: bool = False) -> dict:
    return DailyTask(
        title=task.title,
        category=task.category,
        time=task.time,
        goal=task.goal,
        priority=task.priority,
        status="pending",
        progress=0,
        carried_over=carried_over,
    ).model_dump()


def _task_signature(task: dict) -> str:
    title = str(task.get("title", "")).strip().lower()
    when = str(task.get("time", "")).strip()
    goal = str(task.get("goal", "")).strip().lower()
    category = str(task.get("category", "")).strip().lower()
    return f"{title}|{when}|{goal}|{category}"


def _merge_template_into_existing_tasks(existing_tasks: List[dict], template_tasks: List[RoutineTaskTemplate]) -> List[dict]:
    merged = list(existing_tasks)
    existing_signatures = {_task_signature(t) for t in existing_tasks}

    for tpl in template_tasks:
        as_daily = _template_task_to_daily_task(tpl)
        sig = _task_signature(as_daily)
        if sig in existing_signatures:
            continue
        merged.append(as_daily)
        existing_signatures.add(sig)

    return merged


async def get_routine_template(user_id: str) -> Optional[RoutineTemplate]:
    doc = await routine_collection.find_one({"user_id": user_id})
    if not doc:
        return None
    return RoutineTemplate(**doc)


async def upsert_routine_template(user_id: str, tasks: List[RoutineTaskTemplate]) -> RoutineTemplate:
    now = datetime.utcnow()
    payload = {
        "user_id": user_id,
        "tasks": [t.model_dump() for t in tasks],
        "updated_at": now,
    }
    await routine_collection.update_one(
        {"user_id": user_id},
        {"$set": payload, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )

    # If today's log already exists, append missing template tasks as pending.
    today_doc = await _get_daily_log_doc(user_id, date.today())
    if today_doc is not None:
        merged_tasks = _merge_template_into_existing_tasks(today_doc.get("tasks", []), tasks)
        if len(merged_tasks) != len(today_doc.get("tasks", [])):
            await daily_logs_collection.update_one(
                {"_id": today_doc["_id"]},
                {
                    "$set": {
                        "tasks": merged_tasks,
                        "completion_percentage": _calc_completion_percentage(merged_tasks),
                        "updated_at": datetime.utcnow(),
                    }
                },
            )

    doc = await routine_collection.find_one({"user_id": user_id})
    return RoutineTemplate(**doc)


async def _get_daily_log_doc(user_id: str, target_date: date) -> Optional[dict]:
    return await daily_logs_collection.find_one({"user_id": user_id, "date": target_date.isoformat()})


async def _collect_carry_over_tasks(user_id: str, target_date: date) -> List[dict]:
    previous_doc = await _get_daily_log_doc(user_id, target_date - timedelta(days=1))
    if not previous_doc:
        return []

    carry_over = []
    for task in previous_doc.get("tasks", []):
        if task.get("status") in {"pending", "skipped"}:
            carry_over.append(
                DailyTask(
                    title=task.get("title", ""),
                    category=task.get("category", "other"),
                    time=task.get("time", "09:00"),
                    goal=task.get("goal", ""),
                    priority=task.get("priority", "medium"),
                    status="pending",
                    progress=0,
                    carried_over=True,
                ).model_dump()
            )
    return carry_over


async def get_or_create_daily_log(user_id: str, target_date: Optional[date] = None) -> DailyLog:
    day = target_date or date.today()
    existing = await _get_daily_log_doc(user_id, day)
    if existing:
        # Keep today's checklist synced with new template tasks.
        if day == date.today():
            template = await get_routine_template(user_id)
            template_tasks = template.tasks if template else []
            merged_tasks = _merge_template_into_existing_tasks(existing.get("tasks", []), template_tasks)
            if len(merged_tasks) != len(existing.get("tasks", [])):
                await daily_logs_collection.update_one(
                    {"_id": existing["_id"]},
                    {
                        "$set": {
                            "tasks": merged_tasks,
                            "completion_percentage": _calc_completion_percentage(merged_tasks),
                            "updated_at": datetime.utcnow(),
                        }
                    },
                )
                existing = await daily_logs_collection.find_one({"_id": existing["_id"]})
        return DailyLog(**{**existing, "date": date.fromisoformat(existing["date"])})

    template = await get_routine_template(user_id)
    template_tasks = template.tasks if template else []
    generated_tasks = [_template_task_to_daily_task(task) for task in template_tasks]
    carry_over_tasks = await _collect_carry_over_tasks(user_id, day)
    all_tasks = generated_tasks + carry_over_tasks

    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "date": day.isoformat(),
        "tasks": all_tasks,
        "completion_percentage": _calc_completion_percentage(all_tasks),
        "created_at": now,
        "updated_at": now,
    }
    result = await daily_logs_collection.insert_one(doc)
    created = await daily_logs_collection.find_one({"_id": result.inserted_id})
    return DailyLog(**{**created, "date": date.fromisoformat(created["date"])})


async def update_daily_task_status(
    user_id: str,
    day: date,
    task_id: str,
    status: str,
) -> Optional[DailyLog]:
    doc = await _get_daily_log_doc(user_id, day)
    if not doc:
        return None

    tasks = doc.get("tasks", [])
    found = False
    for task in tasks:
        if task.get("task_id") == task_id:
            found = True
            task["status"] = status
            task["completed_at"] = datetime.utcnow() if status == "completed" else None
            if status == "completed":
                task["progress"] = 100
            elif status == "pending" and int(task.get("progress", 0)) >= 100:
                task["progress"] = 0
            elif status == "skipped":
                task["progress"] = min(int(task.get("progress", 0)), 99)
            break

    if not found:
        return None

    updates = {
        "tasks": tasks,
        "completion_percentage": _calc_completion_percentage(tasks),
        "updated_at": datetime.utcnow(),
    }
    await daily_logs_collection.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await daily_logs_collection.find_one({"_id": doc["_id"]})
    return DailyLog(**{**updated, "date": date.fromisoformat(updated["date"])})


async def update_daily_task_progress(
    user_id: str,
    day: date,
    task_id: str,
    progress: int,
) -> Optional[DailyLog]:
    doc = await _get_daily_log_doc(user_id, day)
    if not doc:
        return None

    p = max(0, min(100, int(progress)))
    tasks = doc.get("tasks", [])
    found = False
    for task in tasks:
        if task.get("task_id") == task_id:
            found = True
            task["progress"] = p
            if p >= 100:
                task["status"] = "completed"
                task["completed_at"] = datetime.utcnow()
            else:
                if task.get("status") != "skipped":
                    task["status"] = "pending"
                task["completed_at"] = None
            break

    if not found:
        return None

    updates = {
        "tasks": tasks,
        "completion_percentage": _calc_completion_percentage(tasks),
        "updated_at": datetime.utcnow(),
    }
    await daily_logs_collection.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await daily_logs_collection.find_one({"_id": doc["_id"]})
    return DailyLog(**{**updated, "date": date.fromisoformat(updated["date"])})


async def delete_daily_task(
    user_id: str,
    day: date,
    task_id: str,
) -> Optional[DailyLog]:
    doc = await _get_daily_log_doc(user_id, day)
    if not doc:
        return None

    tasks = doc.get("tasks", [])
    next_tasks = [task for task in tasks if task.get("task_id") != task_id]
    if len(next_tasks) == len(tasks):
        return None

    updates = {
        "tasks": next_tasks,
        "completion_percentage": _calc_completion_percentage(next_tasks),
        "updated_at": datetime.utcnow(),
    }
    await daily_logs_collection.update_one({"_id": doc["_id"]}, {"$set": updates})
    updated = await daily_logs_collection.find_one({"_id": doc["_id"]})
    return DailyLog(**{**updated, "date": date.fromisoformat(updated["date"])})


async def get_pending_reminders(user_id: str, day: Optional[date] = None) -> List[dict]:
    target_day = day or date.today()
    log = await get_or_create_daily_log(user_id, target_day)
    now_hhmm = datetime.now().strftime("%H:%M")
    reminders = []
    for task in log.tasks:
        if task.status != "pending":
            continue
        if task.time <= now_hhmm:
            reminders.append(task.model_dump())
    return reminders


async def get_due_reminders_for_scheduler(user_id: str, day: Optional[date] = None) -> List[dict]:
    """
    Returns pending reminders that are due now and were not reminded in the current HH:MM slot.
    Marks reminded_at to avoid duplicate spam.
    """
    target_day = day or date.today()
    doc = await _get_daily_log_doc(user_id, target_day)
    if not doc:
        await get_or_create_daily_log(user_id, target_day)
        doc = await _get_daily_log_doc(user_id, target_day)
        if not doc:
            return []

    now = datetime.now()
    now_hhmm = now.strftime("%H:%M")
    due = []

    updated = False
    tasks = doc.get("tasks", [])
    for task in tasks:
        if task.get("status") != "pending":
            continue
        if task.get("time", "23:59") > now_hhmm:
            continue
        reminded_at = task.get("reminded_at")
        if reminded_at and isinstance(reminded_at, datetime) and reminded_at.strftime("%H:%M") == now_hhmm:
            continue
        task["reminded_at"] = now
        due.append(task)
        updated = True

    if updated:
        await daily_logs_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"tasks": tasks, "updated_at": datetime.utcnow()}},
        )
    return due


async def get_due_routine_email_reminders_for_scheduler(user_id: str, day: Optional[date] = None) -> List[dict]:
    """
    Returns pending routine reminders due now, but only once per daily task for email.
    Uses `email_reminded_at` so the same task is not emailed every minute.
    """
    target_day = day or date.today()
    doc = await _get_daily_log_doc(user_id, target_day)
    if not doc:
        await get_or_create_daily_log(user_id, target_day)
        doc = await _get_daily_log_doc(user_id, target_day)
        if not doc:
            return []

    now = datetime.now()
    now_hhmm = now.strftime("%H:%M")
    due = []
    updated = False
    tasks = doc.get("tasks", [])

    for task in tasks:
        if task.get("status") != "pending":
            continue
        if task.get("time", "23:59") > now_hhmm:
            continue
        # Send email only once for this daily task instance.
        if task.get("email_reminded_at"):
            continue
        task["email_reminded_at"] = now
        due.append(task)
        updated = True

    if updated:
        await daily_logs_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": {"tasks": tasks, "updated_at": datetime.utcnow()}},
        )

    return due


async def list_routine_user_ids() -> List[str]:
    users = set()
    routine_ids = await routine_collection.distinct("user_id")
    daily_ids = await daily_logs_collection.distinct("user_id")
    for uid in routine_ids + daily_ids:
        if uid:
            users.add(str(uid))
    return sorted(users)


async def get_progress_analytics(user_id: str, reference_date: Optional[date] = None) -> Dict:
    ref = reference_date or date.today()
    week_start = ref - timedelta(days=6)
    month_start = ref - timedelta(days=29)

    weekly = []
    monthly = []
    streak = 0

    cursor = daily_logs_collection.find({"user_id": user_id})
    docs = []
    async for doc in cursor:
        log_date = date.fromisoformat(doc["date"])
        docs.append((log_date, doc))
        if log_date >= week_start:
            weekly.append({"date": doc["date"], "completion_percentage": doc.get("completion_percentage", 0)})
        if log_date >= month_start:
            monthly.append({"date": doc["date"], "completion_percentage": doc.get("completion_percentage", 0)})

    docs.sort(key=lambda x: x[0], reverse=True)
    expected_date = ref
    for log_date, doc in docs:
        if log_date != expected_date:
            break
        if doc.get("completion_percentage", 0) < 100:
            break
        streak += 1
        expected_date = expected_date - timedelta(days=1)

    today_log = await get_or_create_daily_log(user_id, ref)
    total_tasks = len(today_log.tasks)
    completed = sum(1 for t in today_log.tasks if t.status == "completed")
    pending = sum(1 for t in today_log.tasks if t.status == "pending")
    skipped = sum(1 for t in today_log.tasks if t.status == "skipped")

    return {
        "daily": {
            "date": ref.isoformat(),
            "completion_percentage": today_log.completion_percentage,
            "completed": completed,
            "pending": pending,
            "skipped": skipped,
            "total": total_tasks,
        },
        "weekly": sorted(weekly, key=lambda x: x["date"]),
        "monthly": sorted(monthly, key=lambda x: x["date"]),
        "streak_days": streak,
    }


async def detect_failure_and_suggestions(user_id: str, day: Optional[date] = None) -> Dict:
    target_day = day or date.today()
    log = await get_or_create_daily_log(user_id, target_day)
    pending = [task for task in log.tasks if task.status == "pending"]
    skipped = [task for task in log.tasks if task.status == "skipped"]

    suggestions = []
    if len(pending) + len(skipped) >= 3:
        suggestions.append("You missed several tasks. Try reducing tomorrow's load by 20-30%.")
    if any(t.priority == "high" for t in pending):
        suggestions.append("Start with one high-priority task first thing in the day.")
    if pending and all(t.time >= "20:00" for t in pending):
        suggestions.append("Most pending tasks are late. Move one task to morning for better consistency.")
    if not suggestions:
        suggestions.append("Great momentum. Keep routine size stable and review goals weekly.")

    return {
        "date": target_day.isoformat(),
        "pending_count": len(pending),
        "skipped_count": len(skipped),
        "suggestions": suggestions,
    }


async def create_goal_plan(user_id: str, goal: GoalPlan) -> GoalPlan:
    payload = goal.model_dump(by_alias=True, exclude={"id"})
    payload["user_id"] = user_id
    result = await goals_collection.insert_one(payload)
    created = await goals_collection.find_one({"_id": result.inserted_id})
    return GoalPlan(**created)


async def list_goal_plans(user_id: str) -> List[GoalPlan]:
    goals = []
    cursor = goals_collection.find({"user_id": user_id})
    async for doc in cursor:
        goals.append(GoalPlan(**doc))
    return goals


async def start_focus_session(user_id: str, task_id: Optional[str], target_minutes: int = 25) -> FocusSession:
    target_minutes = max(1, min(int(target_minutes or 25), 180))
    existing_active = await focus_collection.find_one({"user_id": user_id, "ended_at": None})
    if existing_active:
        return FocusSession(**existing_active)

    payload = FocusSession(
        user_id=user_id,
        task_id=task_id,
        target_minutes=target_minutes,
        started_at=datetime.utcnow(),
        ended_at=None,
        duration_seconds=0,
    ).model_dump(by_alias=True, exclude={"id"})
    result = await focus_collection.insert_one(payload)
    created = await focus_collection.find_one({"_id": result.inserted_id})
    return FocusSession(**created)


async def stop_focus_session(user_id: str, session_id: str, ended_at: Optional[datetime] = None) -> Optional[FocusSession]:
    from bson import ObjectId

    if not ObjectId.is_valid(session_id):
        return None
    doc = await focus_collection.find_one({"_id": ObjectId(session_id)})
    if not doc or str(doc.get("user_id")) != str(user_id):
        return None
    if doc.get("ended_at") is not None:
        return FocusSession(**doc)

    start_time = doc.get("started_at") or datetime.utcnow()
    final_end = ended_at or datetime.utcnow()
    duration_seconds = max(0, int((final_end - start_time).total_seconds()))

    await focus_collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {"ended_at": final_end, "duration_seconds": duration_seconds}},
    )
    updated = await focus_collection.find_one({"_id": doc["_id"]})
    return FocusSession(**updated)


async def get_active_focus_session(user_id: str) -> Optional[FocusSession]:
    doc = await focus_collection.find_one({"user_id": user_id, "ended_at": None})
    if not doc:
        return None
    return FocusSession(**doc)


async def get_focus_stats(user_id: str, days: int = 7) -> Dict:
    days = max(1, min(days, 60))
    start = datetime.utcnow() - timedelta(days=days - 1)
    cursor = focus_collection.find({"user_id": user_id, "started_at": {"$gte": start}})
    sessions = []
    async for doc in cursor:
        sessions.append(FocusSession(**doc))

    total_seconds = sum(s.duration_seconds for s in sessions)
    completed_sessions = sum(1 for s in sessions if s.ended_at is not None)
    avg_seconds = int(total_seconds / completed_sessions) if completed_sessions else 0

    by_day = {}
    for i in range(days):
        d = (start + timedelta(days=i)).date().isoformat()
        by_day[d] = 0
    for s in sessions:
        day_key = s.started_at.date().isoformat()
        by_day[day_key] = by_day.get(day_key, 0) + s.duration_seconds

    trend = [{"date": day, "minutes": int(seconds / 60)} for day, seconds in sorted(by_day.items())]

    return {
        "days": days,
        "total_minutes": int(total_seconds / 60),
        "completed_sessions": completed_sessions,
        "average_session_minutes": int(avg_seconds / 60),
        "trend": trend,
    }
