from uuid import uuid4
import datetime

# Хранилище
events_db = []
users_db = {}

# Заполняем тестовыми пользователями
test_users = [
    ("user1", "Арсен"),
    ("user2", "Маша"),
    ("user3", "Дима"),
    ("user4", "Лена"),
    ("user5", "Саша"),
]
for uid, name in test_users:
    users_db[uid] = {"id": uid, "name": name}

def create_event(name, description, date, creator_id, category='🎉', latitude=None, longitude=None):
    event = {
        "id": str(uuid4()),
        "name": name,
        "description": description,
        "date": date,
        "creator_id": creator_id,
        "category": category,
        "participants": [creator_id],
        "latitude": latitude,
        "longitude": longitude,
        "photos": [],          # <-- обязательно запятая после этой строки
        "archived": False      # <-- и после этой запятая не нужна (она последняя)
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

def register_user(user_id, name=None):
    if user_id not in users_db:
        users_db[user_id] = {"id": user_id, "name": name or user_id}

def get_user(user_id):
    # Автоматически регистрируем, если вдруг пропустили
    if user_id not in users_db:
        register_user(user_id)
    return users_db.get(user_id)

# --- ФОТОГРАФИИ ---
def add_photo(event_id, base64_image, user_id):
    event = next((e for e in events_db if e['id'] == event_id), None)
    if event:
        if 'photos' not in event:
            event['photos'] = []
        event['photos'].append({
            "image": base64_image,
            "addedBy": user_id
        })
        return True
    return False

def get_photos(event_id):
    event = next((e for e in events_db if e['id'] == event_id), None)
    if event:
        return event.get('photos', [])
    return []
def archive_old_events():
    """Помечает события, прошедшие более 2 дней назад, как архивные"""
    now = datetime.datetime.now()
    for event in events_db:
        if event.get('archived'):
            continue
        try:
            event_date = datetime.datetime.fromisoformat(event['date'])
            if (now - event_date).days >= 2:   # прошло 2 дня после события
                event['archived'] = True
        except:
            pass

def get_active_events():
    """Возвращает только неархивированные события"""
    archive_old_events()   # обновляем статусы перед выдачей
    return [e for e in events_db if not e.get('archived')]

def get_archived_events():
    """Возвращает только архивированные события"""
    archive_old_events()
    return [e for e in events_db if e.get('archived')]
# --- АЧИВКИ ---
def get_user_vibe(user_id):
    user = get_user(user_id)
    if not user:
        return None

    events_created = [e for e in events_db if e.get('creator_id') == user_id]
    events_attended = [e for e in events_db if user_id in e.get('participants', [])]

    achievements = []
    achievements.append({"emoji": "🐪", "name": "Организованный верблюд"})

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
