import json
import re
from datetime import datetime
from typing import List

from decouple import config

from models import RoutineTaskTemplate


OPENAI_API_KEY = config("OPENAI_API_KEY", default="")


def _heuristic_parse_task(text: str) -> RoutineTaskTemplate:
    clean = text.strip()
    time_match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", clean, flags=re.IGNORECASE)

    hour = 9
    minute = 0
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2) or 0)
        suffix = (time_match.group(3) or "").lower()
        if suffix == "pm" and hour < 12:
            hour += 12
        if suffix == "am" and hour == 12:
            hour = 0

    hhmm = f"{hour:02d}:{minute:02d}"

    category = "other"
    lowered = clean.lower()
    if "dsa" in lowered:
        category = "dsa"
    elif "backend" in lowered:
        category = "backend"
    elif "frontend" in lowered:
        category = "frontend"
    elif "system design" in lowered:
        category = "system-design"

    priority = "medium"
    if any(k in lowered for k in ["urgent", "important", "interview"]):
        priority = "high"
    if any(k in lowered for k in ["later", "optional", "light"]):
        priority = "low"

    goal = "1 focused session"
    goal_match = re.search(r"(solve\s+\d+\s+\w+|for\s+\d+\s+(minutes|minute|hours|hour))", lowered)
    if goal_match:
        goal = goal_match.group(1)

    title = clean
    if " at " in lowered:
        title = clean.split(" at ")[0].strip().capitalize()
    if not title:
        title = "New routine task"

    return RoutineTaskTemplate(
        title=title,
        category=category,
        time=hhmm,
        goal=goal,
        priority=priority,
    )


async def parse_natural_language_task(text: str) -> RoutineTaskTemplate:
    if not OPENAI_API_KEY:
        return _heuristic_parse_task(text)

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Convert natural language into a routine task JSON with keys: "
                        "title, category(dsa/backend/other/frontend/system-design), time(HH:MM 24h), goal, priority(low/medium/high)."
                    ),
                },
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content or "{}")
        return RoutineTaskTemplate(
            title=parsed.get("title", "New routine task"),
            category=parsed.get("category", "other"),
            time=parsed.get("time", datetime.now().strftime("%H:%M")),
            goal=parsed.get("goal", "1 focused session"),
            priority=parsed.get("priority", "medium"),
        )
    except Exception:
        return _heuristic_parse_task(text)


def suggest_from_history(history: List[dict]) -> List[RoutineTaskTemplate]:
    if not history:
        return [
            RoutineTaskTemplate(title="Practice DSA", category="dsa", time="06:00", goal="Solve 2 problems", priority="high"),
            RoutineTaskTemplate(title="Backend Revision", category="backend", time="19:00", goal="Build 1 API module", priority="medium"),
        ]

    category_count = {}
    for item in history:
        cat = item.get("category", "other")
        category_count[cat] = category_count.get(cat, 0) + 1

    dominant = max(category_count, key=category_count.get)
    return [
        RoutineTaskTemplate(
            title=f"Deep Work: {dominant.upper()}",
            category=dominant,
            time="07:00",
            goal="1 high-focus session",
            priority="high",
        ),
        RoutineTaskTemplate(
            title="Revision + Notes",
            category="other",
            time="21:00",
            goal="Review progress and prepare next day",
            priority="medium",
        ),
    ]
