from typing import List

# Модель участника
class Participant(BaseModel):
    user_id: int
    username: str
    status: str  # "going", "maybe", "declined"

# Данные ивента (пока в памяти)
event_data = {
    "title": "Вечерняя прогулка по центру",
    "location": "Парк Горького, у главного входа",
    "time": "19:00, Суббота",
    "participants": []
}

@app.get("/api/event")
async def get_event():
    return event_data

@app.post("/api/event/join")
async def join_event(person: Participant):
    # Удаляем старый статус пользователя, если он уже кликал
    event_data["participants"] = [p for p in event_data["participants"] if p['user_id'] != person.user_id]
    
    # Добавляем новый статус
    event_data["participants"].append(person.dict())
    return {"status": "updated", "count": len(event_data["participants"])}
