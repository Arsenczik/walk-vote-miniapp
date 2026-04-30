# database.py

events = []
participants = {}  # event_id -> [usernames]

def create_event(title, date, location, maps_url):
    event = {
        "id": len(events) + 1,
        "title": title,
        "date": date,
        "location": location,
        "maps_url": maps_url
    }
    events.append(event)
    participants[event["id"]] = []
    return event

def get_events():
    return events

def join_event(event_id, username):
    if username not in participants[event_id]:
        participants[event_id].append(username)

def get_participants(event_id):
    return participants.get(event_id, [])
