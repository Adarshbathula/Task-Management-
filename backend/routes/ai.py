from datetime import date

from fastapi import APIRouter, Depends

from ai_service import parse_natural_language_task, suggest_from_history
from login.oauth import get_current_user
from models import NaturalLanguageTaskInput, TokenData
from routine_db import get_or_create_daily_log


ai = APIRouter(prefix="/api/ai", tags=["ai"])


@ai.post("/parse-task")
async def parse_task(input_data: NaturalLanguageTaskInput, _user: TokenData = Depends(get_current_user)):
    task = await parse_natural_language_task(input_data.text)
    return task


@ai.post("/voice-task")
async def parse_voice_transcript(input_data: NaturalLanguageTaskInput, user: TokenData = Depends(get_current_user)):
    task = await parse_natural_language_task(input_data.text)
    return {"source": "voice", "task": task}


@ai.get("/suggestions")
async def ai_suggestions(current_user: TokenData = Depends(get_current_user)):
    today_log = await get_or_create_daily_log(current_user.user_id, date.today())
    history = [t.model_dump() for t in today_log.tasks]
    return {"tasks": suggest_from_history(history)}
