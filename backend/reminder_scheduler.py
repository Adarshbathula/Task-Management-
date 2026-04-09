import asyncio
import logging

from fastapi.encoders import jsonable_encoder

from email_service import send_pending_reminders_email, send_pending_tasks_email
from routine_db import (
    get_due_reminders_for_scheduler,
    get_due_routine_email_reminders_for_scheduler,
    list_routine_user_ids,
)
from socket_server import emit_user_event
from task_db import get_due_task_email_reminders_for_scheduler, list_task_user_ids
from user_db import get_user_email_by_id


logger = logging.getLogger(__name__)


class ReminderScheduler:
    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = max(20, interval_seconds)
        self._task = None
        self._running = False

    async def _run(self):
        while self._running:
            try:
                routine_user_ids = await list_routine_user_ids()
                task_user_ids = await list_task_user_ids()
                user_ids = sorted(set(routine_user_ids + task_user_ids))
                for user_id in user_ids:
                    routine_socket_reminders = await get_due_reminders_for_scheduler(user_id)
                    if routine_socket_reminders:
                        await emit_user_event(
                            user_id,
                            "pending_reminders",
                            jsonable_encoder(
                                {
                                    "count": len(routine_socket_reminders),
                                    "tasks": routine_socket_reminders,
                                }
                            ),
                        )
                    routine_email_reminders = await get_due_routine_email_reminders_for_scheduler(user_id)
                    task_reminders = await get_due_task_email_reminders_for_scheduler(user_id)

                    if routine_email_reminders or task_reminders:
                        email = await get_user_email_by_id(user_id)
                        if email:
                            if routine_email_reminders:
                                await send_pending_reminders_email(email, routine_email_reminders)
                            if task_reminders:
                                await send_pending_tasks_email(email, task_reminders)
            except Exception as exc:
                logger.exception("Reminder scheduler iteration failed: %s", exc)
            await asyncio.sleep(self.interval_seconds)

    async def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run())

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
