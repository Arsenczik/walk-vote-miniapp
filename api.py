from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from pydantic import BaseModel
import database

app = FastAPI()
database.init_db()

@app.get("/api/user/{user_id}")
async def get_user(user_id: int):
    # Тут будет логика получения очков и ачивок
    return {"user_id": user_id, "points": 150, "rank": "Заводила", "achievements": ["🍖", "🌊"]}

@app.get("/api/events")
async def get_events():
    # Возвращаем список будущих тусовок
    return [
        {"id": 1, "title": "Шашлыки", "date": "15.05", "location": "Pole Mokotowskie"},
        {"id": 2, "title": "Аквапарк", "date": "20.05", "location": "Suntago"}
    ]

app.mount("/", StaticFiles(directory="static", html=True), name="static")
