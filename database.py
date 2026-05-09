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
        "photos": [],
        "archived_at": None,
        "special_achievements": []   # список достижений, задаваемых создателем
    }
    events_db.append(event)
    return event

def get_events():
    """Для совместимости – возвращает все события, но активно используется get_active_events"""
    events = get_active_events()
    events_with_names = []
    for e in events:
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
    """Создаёт пользователя, если его ещё нет"""
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


# --- АЧИВКИ ---
def get_user_vibe(user_id):
    user = get_user(user_id)
    if not user:
        return None

    events_created = [e for e in events_db if e.get('creator_id') == user_id]
    events_attended = [e for e in events_db if user_id in e.get('participants', [])]

    achievements = []

    # 1. Приветственная ачивка
    achievements.append({
        "emoji": "🐪",
        "name": "Организованный верблюд",
        "description": "Первый шаг в большое путешествие. Добро пожаловать в Караван!"
    })

    # 2. За создание события
    if len(events_created) >= 1:
        achievements.append({
            "emoji": "📢",
            "name": "Заводила",
            "description": "Вожак каравана! Ты сделал первый шаг, чтобы собрать друзей вместе."
        })

    # 3. За посещение трёх событий
    if len(events_attended) >= 3:
        achievements.append({
            "emoji": "⭐",
            "name": "Старожил",
            "description": "Пыль дорог на твоих сандалиях. Ты видел многое и готов к новым приключениям."
        })

    # Добавляем специальные достижения (если есть)
    if 'special_achievements' in user:
        for ach_key, ach in user['special_achievements'].items():
            achievements.append({
                "emoji": ach['emoji'],
                "name": ach['name'],
                "description": ach.get('description', '')
            })

    return {
        "user": user,
        "achievements": achievements,
        "stats": {
            "created": len(events_created),
            "attended": len(events_attended)
        }
    }


# --- АРХИВ ---
def archive_old_events():
    """Помечает события, прошедшие 2 дня после даты, как архивные (ставит archived_at)"""
    now = datetime.datetime.now()
    for event in events_db:
        if not event.get('archived_at'):
            try:
                event_date = datetime.datetime.fromisoformat(event['date'])
                if (now - event_date).days >= 2:
                    event['archived_at'] = now.isoformat()
            except:
                pass


def delete_old_archived():
    """Удаляет события, которые находятся в архиве больше 7 дней"""
    now = datetime.datetime.now()
    events_to_keep = []
    for event in events_db:
        if event.get('archived_at'):
            try:
                archived_time = datetime.datetime.fromisoformat(event['archived_at'])
                if (now - archived_time).days < 7:
                    events_to_keep.append(event)
                # иначе – не добавляем, событие удаляется
            except:
                events_to_keep.append(event)
        else:
            events_to_keep.append(event)
    events_db.clear()
    events_db.extend(events_to_keep)


def get_active_events():
    """Возвращает только неархивированные события"""
    archive_old_events()
    delete_old_archived()
    return [e for e in events_db if not e.get('archived_at')]


def get_archived_events():
    """Возвращает только архивированные события"""
    archive_old_events()
    delete_old_archived()
    return [e for e in events_db if e.get('archived_at')]
    
def delete_event(event_id):
    """Удаляет событие по ID"""
    global events_db
    events_db = [e for e in events_db if e['id'] != event_id]
    return True

# --- СПЕЦИАЛЬНЫЕ ДОСТИЖЕНИЯ ---
def set_special_achievements(event_id, achievements_list):
    """Сохраняет массив достижений (до 3 штук) для события"""
    event = next((e for e in events_db if e['id'] == event_id), None)
    if event:
        event['special_achievements'] = achievements_list
        return True
    return False

def assign_achievement(event_id, achievement_index, user_ids):
    """Назначает достижение участникам. achievement_index – индекс в списке special_achievements."""
    event = next((e for e in events_db if e['id'] == event_id), None)
    if not event or achievement_index >= len(event.get('special_achievements', [])):
        return False

    ach = event['special_achievements'][achievement_index]
    # Инициализируем список назначенных, если нет
    if 'assignedTo' not in ach:
        ach['assignedTo'] = []
    # Проверяем, что не превышаем 3
    available = 3 - len(ach['assignedTo'])
    users_to_add = user_ids[:available]
    ach['assignedTo'].extend(users_to_add)

    # Добавляем достижение в профили пользователей
    for uid in users_to_add:
        user = get_user(uid)
        if user:
            if 'special_achievements' not in user:
                user['special_achievements'] = {}
            # Сохраняем информацию о достижении
            user['special_achievements'][event_id + '_' + str(achievement_index)] = {
                "emoji": ach['emoji'],
                "name": ach['name'],
                "description": ach.get('description', ''),
                "event_id": event_id,
                "event_name": event['name']
            }
    return True
