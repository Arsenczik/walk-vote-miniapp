from uuid import uuid4

events_db = []
users_db = {
    "user1": {"id": "user1", "name": "Арсен"},
    "user2": {"id": "user2", "name": "Маша"},
    "user3": {"id": "user3", "name": "Дима"},
    "user4": {"id": "user4", "name": "Лена"},
    "user5": {"id": "user5", "name": "Саша"},
}

def create_event(name, description, date, creator_id, category='🎉'):
    event = {
        "id": str(uuid4()),
        "name": name,
        "description": description,
        "date": date,
        "creator_id": creator_id,
        "category": category,
        "participants": [creator_id]
    }
    events_db.append(event)
    return event

def get_events():
    events_with_names = []
    for e in events_db:
        creator = get_user(e.get('creator_id'))
        events_with_names.append({
            **e,
            "creator_name": creator['name'] if creator else 'Unknown'
        })
    return events_with_names

def get_event(event_id):
    for e in events_db:
        if e['id'] == event_id:
            creator = get_user(e.get('creator_id'))
            return {
                **e,
                "creator_name": creator['name'] if creator else 'Unknown'
            }
    return None

def add_participant(event_id, user_id):
    event = next((e for e in events_db if e['id'] == event_id), None)
    if event and user_id not in event['participants']:
        event['participants'].append(user_id)
        return True
    return False

def remove_participant(event_id, user_id):
    event = next((e for e in events_db if e['id'] == event_id), None)
    if event and user_id in event['participants']:
        event['participants'].remove(user_id)
        return True
    return False

def get_participants(event_id):
    event = get_event(event_id)
    if event:
        participants = []
        for pid in event.get('participants', []):
            user = get_user(pid)
            if user:
                participants.append(user)
        return participants
    return []

def get_user(user_id):
    return users_db.get(user_id)

def get_user_vibe(user_id):
    user = get_user(user_id)
    if not user:
        return None
    
    events_created = [e for e in events_db if e.get('creator_id') == user_id]
    events_attended = [e for e in events_db if user_id in e.get('participants', [])]
    
    achievements = []
    
    if len(events_created) >= 2:
        achievements.append({"emoji": "📢", "name": "Заводила"})
    
    cat_count = {}
    for e in events_attended:
        cat = e.get('category', '🫥')
        cat_count[cat] = cat_count.get(cat, 0) + 1
    
    if cat_count:
        favorite_cat = max(cat_count, key=cat_count.get)
        cat_achievements = {
            "🍖": {"emoji": "🔥", "name": "Король Шашлыка"},
            "🌊": {"emoji": "💧", "name": "Водный маг"},
            "🎲": {"emoji": "🎯", "name": "Повелитель Подземелий"},
            "🎬": {"emoji": "🍿", "name": "Киноман"},
            "🍻": {"emoji": "🍺", "name": "Барный завсегдатай"},
            "🎂": {"emoji": "🎉", "name": "Душа компании"},
            "🎸": {"emoji": "🎵", "name": "Рок-звезда"},
            "🏀": {"emoji": "⛹️", "name": "Спортсмен"},
        }
        if favorite_cat in cat_achievements:
            achievements.append(cat_achievements[favorite_cat])
    
    if len(events_attended) >= 5:
        achievements.append({"emoji": "⭐", "name": "Старожил"})
    
    return {
        "user": user,
        "achievements": achievements,
        "stats": {
            "created": len(events_created),
            "attended": len(events_attended)
        }
    }
