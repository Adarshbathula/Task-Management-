import socketio
from fastapi.encoders import jsonable_encoder


sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio)


@sio.event
async def connect(sid, environ, auth):
    user_id = None
    if isinstance(auth, dict):
        user_id = auth.get("user_id")
    if user_id:
        await sio.enter_room(sid, f"user:{user_id}")


@sio.event
async def disconnect(sid):
    return


async def emit_user_event(user_id: str, event_name: str, payload: dict):
    safe_payload = jsonable_encoder(payload)
    await sio.emit(event_name, safe_payload, room=f"user:{user_id}")
