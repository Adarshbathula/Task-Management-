from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage
from typing import List

from decouple import config


SMTP_HOST = config("SMTP_HOST", default="")
SMTP_PORT = int(config("SMTP_PORT", default=587))
SMTP_USERNAME = config("SMTP_USERNAME", default="")
SMTP_PASSWORD = config("SMTP_PASSWORD", default="")
SMTP_FROM_EMAIL = config("SMTP_FROM_EMAIL", default=SMTP_USERNAME or "")
SMTP_USE_TLS = config("SMTP_USE_TLS", default="true").lower() == "true"
REMINDER_EMAIL_ENABLED = config("REMINDER_EMAIL_ENABLED", default="true").lower() == "true"


def _build_reminder_body(reminders: List[dict]) -> str:
    lines = [
        "You have pending routine tasks:",
        "",
    ]
    for idx, task in enumerate(reminders, start=1):
        title = task.get("title", "Task")
        when = task.get("time", "--:--")
        goal = task.get("goal", "")
        lines.append(f"{idx}. {when} - {title}")
        if goal:
            lines.append(f"   Goal: {goal}")
    lines.extend(["", "Open your dashboard to update progress."])
    return "\n".join(lines)


def _send_sync(to_email: str, subject: str, body: str):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        if SMTP_USE_TLS:
            server.starttls()
        if SMTP_USERNAME and SMTP_PASSWORD:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)


async def send_pending_reminders_email(to_email: str, reminders: List[dict]):
    if not REMINDER_EMAIL_ENABLED:
        return
    if not SMTP_HOST or not SMTP_FROM_EMAIL or not to_email:
        return
    subject = f"Routine Reminder: {len(reminders)} pending task(s)"
    body = _build_reminder_body(reminders)
    await asyncio.to_thread(_send_sync, to_email, subject, body)


def _build_task_reminder_body(reminders: List[dict]) -> str:
    lines = [
        "You still have incomplete tasks due today or overdue:",
        "",
    ]
    for idx, task in enumerate(reminders, start=1):
        title = task.get("title", "Task")
        due_date = task.get("due_date", "No due date")
        priority = str(task.get("priority", "medium")).upper()
        status = task.get("status", "pending")
        lines.append(f"{idx}. {title}")
        lines.append(f"   Due: {due_date} | Priority: {priority} | Status: {status}")
    lines.extend(["", "Open your Tasks page and update them."])
    return "\n".join(lines)


async def send_pending_tasks_email(to_email: str, reminders: List[dict]):
    if not REMINDER_EMAIL_ENABLED:
        return
    if not SMTP_HOST or not SMTP_FROM_EMAIL or not to_email:
        return
    subject = f"Task Reminder: {len(reminders)} incomplete task(s)"
    body = _build_task_reminder_body(reminders)
    await asyncio.to_thread(_send_sync, to_email, subject, body)
