from datetime import date, datetime, timedelta, time
from typing import List

from bson import ObjectId
from decouple import config
from motor.motor_asyncio import AsyncIOMotorClient

from models import Task


mongo_url = config("DB_URL", default=None) or config("MONGODB_URL")
client = AsyncIOMotorClient(mongo_url)

raw_db_name = config("TASKS_DB_NAME", default="taskdatabase")
database_name = raw_db_name.split()[0] if raw_db_name else "taskdatabase"
database = client[database_name]
collection = database.tasks
TASK_EMAIL_REMINDER_MIN_INTERVAL_MINUTES = int(
    config("TASK_EMAIL_REMINDER_MIN_INTERVAL_MINUTES", default=180)
)


def _coerce_due_date(value):
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        return datetime.fromisoformat(value).date()
    return None


def _convert_date_to_datetime(value):
    """Convert date to datetime for MongoDB storage."""
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime.combine(value, time.min)
    return value


def _normalize_task_document(document: dict) -> dict:
    normalized = dict(document)

    if not normalized.get("status"):
        completed = normalized.get("completed")
        normalized["status"] = "completed" if completed else "pending"

    due = _coerce_due_date(normalized.get("due_date"))
    status = normalized.get("status")

    if status != "completed" and due is not None:
        normalized["status"] = "overdue" if due < date.today() else "pending"

    if normalized.get("status") == "completed" and not normalized.get("completed_at"):
        normalized["completed_at"] = normalized.get("created_at") or datetime.utcnow()

    return normalized


def _coerce_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
    return None


async def get_one_task_id(id):
    task = await collection.find_one({'_id': ObjectId(id)})
    if not task:
        return None
    return Task(**_normalize_task_document(task))


async def get_one_task_title(user_id: str, title: str):
    task = await collection.find_one({'user_id': user_id, 'title': title})
    if not task:
        return None
    return Task(**_normalize_task_document(task))


async def get_all_tasks():
    tasks = []
    cursor = collection.find({})
    async for document in cursor:
        tasks.append(Task(**_normalize_task_document(document)))
    return tasks


async def get_tasks_by_user(user_id: str):
    tasks = []
    async for document in collection.find({"user_id": user_id}):
        tasks.append(Task(**_normalize_task_document(document)))
    return tasks


async def create_task(task_data: dict):
    task_data = dict(task_data)

    # ✅ FIX — convert date to datetime before saving to MongoDB
    if task_data.get("due_date") is not None:
        task_data["due_date"] = _convert_date_to_datetime(task_data["due_date"])

    due = _coerce_due_date(task_data.get("due_date"))
    status = task_data.get("status", "pending")

    # Derive status from due_date
    if status != "completed" and due is not None:
        task_data["status"] = "overdue" if due < date.today() else "pending"

    if task_data.get("status") == "completed" and not task_data.get("completed_at"):
        task_data["completed_at"] = datetime.utcnow()

    new_task = await collection.insert_one(task_data)
    created_task = await collection.find_one({'_id': new_task.inserted_id})
    if not created_task:
        return None
    return Task(**_normalize_task_document(created_task))


async def update_task(id: str, data):
    update_fields = data.model_dump(exclude_unset=True)
    update_fields = dict(update_fields)

    # Backwards compatibility: if older clients send `completed`
    if "completed" in update_fields:
        completed = update_fields.pop("completed")
        if completed is not None and "status" not in update_fields:
            update_fields["status"] = "completed" if completed else "pending"

    # ✅ FIX — convert date to datetime before saving to MongoDB
    if update_fields.get("due_date") is not None:
        update_fields["due_date"] = _convert_date_to_datetime(update_fields["due_date"])

    existing = await collection.find_one({"_id": ObjectId(id)})
    if not existing:
        return None

    current_status = existing.get("status", "pending")
    current_due = existing.get("due_date")

    new_status = update_fields.get("status", current_status)
    new_due = update_fields.get("due_date", current_due)
    due = _coerce_due_date(new_due)

    # Derive overdue unless explicitly completed
    if new_status != "completed" and due is not None:
        new_status = "overdue" if due < date.today() else "pending"

    update_fields["status"] = new_status

    if new_status == "completed":
        update_fields["completed_at"] = (
            update_fields.get("completed_at")
            or existing.get("completed_at")
            or datetime.utcnow()
        )
    else:
        # Clear completed_at when leaving completed state
        update_fields["completed_at"] = None

    await collection.update_one({"_id": ObjectId(id)}, {"$set": update_fields})
    document = await collection.find_one({'_id': ObjectId(id)})
    if not document:
        return None
    return Task(**_normalize_task_document(document))


async def delete_task(id: str):
    await collection.delete_one({'_id': ObjectId(id)})
    return True


async def get_task_stats_by_user(user_id: str):
    completed = 0
    pending = 0
    overdue = 0
    total = 0

    cursor = collection.find({"user_id": user_id})
    async for doc in cursor:
        total += 1
        normalized = _normalize_task_document(doc)
        status = normalized.get("status", "pending")
        if status == "completed":
            completed += 1
        elif status == "overdue":
            overdue += 1
        else:
            pending += 1

    return {
        "total": int(total),
        "completed": completed,
        "pending": pending,
        "overdue": overdue
    }


async def get_completed_per_day_last_7_days(user_id: str):
    start_date = date.today() - timedelta(days=6)
    end_date = date.today() + timedelta(days=1)

    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(end_date, time.min)

    # Initialize all days so chart always renders 7 bars
    day_counts = {(start_date + timedelta(days=i)): 0 for i in range(7)}

    cursor = collection.find({"user_id": user_id})
    async for doc in cursor:
        normalized = _normalize_task_document(doc)
        if normalized.get("status") != "completed":
            continue
        completed_at = normalized.get("completed_at")
        if not completed_at or not isinstance(completed_at, datetime):
            continue
        if not (start_dt <= completed_at < end_dt):
            continue
        d = completed_at.date()
        if d in day_counts:
            day_counts[d] += 1

    labels = [(start_date + timedelta(days=i)).strftime("%a") for i in range(7)]
    counts = [day_counts[start_date + timedelta(days=i)] for i in range(7)]

    return {"labels": labels, "counts": counts}


async def list_task_user_ids() -> List[str]:
    ids = await collection.distinct("user_id")
    users = {str(uid) for uid in ids if uid}
    return sorted(users)


async def get_due_task_email_reminders_for_scheduler(
    user_id: str,
    reference_dt: datetime | None = None,
) -> List[dict]:
    now = reference_dt or datetime.now()
    today = now.date()
    min_interval = max(5, TASK_EMAIL_REMINDER_MIN_INTERVAL_MINUTES)
    cutoff = now - timedelta(minutes=min_interval)

    cursor = collection.find({"user_id": user_id, "status": {"$ne": "completed"}})
    due: List[dict] = []
    due_ids = []

    async for doc in cursor:
        normalized = _normalize_task_document(doc)
        due_date = _coerce_due_date(normalized.get("due_date"))
        if due_date is None or due_date > today:
            continue

        reminded_at = _coerce_datetime(normalized.get("email_reminded_at"))
        if reminded_at and reminded_at > cutoff:
            continue

        due_ids.append(doc["_id"])
        due.append(
            {
                "id": str(doc["_id"]),
                "title": normalized.get("title", "Task"),
                "priority": normalized.get("priority", "medium"),
                "status": normalized.get("status", "pending"),
                "due_date": due_date.isoformat(),
            }
        )

    if due_ids:
        await collection.update_many(
            {"_id": {"$in": due_ids}},
            {"$set": {"email_reminded_at": now}},
        )

    return due
