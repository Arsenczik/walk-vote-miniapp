import os
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from database import init_db, create_poll, save_vote, get_polls

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await init_db()

@app.get("/api/polls")
async def polls():
    return await get_polls()

class PollCreate(BaseModel):
    title: str
    is_daily: bool = False

@app.post("/api/polls")
async def create(data: PollCreate):
    poll_id = uuid.uuid4().hex[:8]
    await create_poll(poll_id, data.title, data.is_daily)
    return {"id": poll_id}

class VoteCreate(BaseModel):
    user_id: int
    user_name: str
    answer: str

@app.post("/api/polls/{poll_id}/vote")
async def vote(poll_id: str, data: VoteCreate):
    await save_vote(poll_id, data.user_id, data.user_name, data.answer)
    return {"ok": True}

app.mount("/", StaticFiles(directory="static", html=True), name="static")
