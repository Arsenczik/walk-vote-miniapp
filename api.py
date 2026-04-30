from flask import Blueprint, request, jsonify
import database

api_bp = Blueprint('api', __name__, url_prefix='/api')

# 📅 Получить все события
@api_bp.route('/events', methods=['GET'])
def get_events():
    events = database.get_events()
    return jsonify(events)

# 📅 Создать событие
@api_bp.route('/events', methods=['POST'])
def create_event():
    data = request.json
    event = database.create_event(
        name=data['name'],
        description=data.get('description', ''),
        date=data['date'],
        creator_id=data['creator_id'],
        category=data.get('category', '🎉')
    )
    return jsonify(event), 201

# 📅 Получить одно событие
@api_bp.route('/events/<event_id>', methods=['GET'])
def get_event(event_id):
    event = database.get_event(event_id)
    if event:
        return jsonify(event)
    return jsonify({"error": "Event not found"}), 404

# ✅ Присоединиться к событию
@api_bp.route('/join', methods=['POST'])
def join_event():
    data = request.json
    event_id = data['event_id']
    user_id = data['user_id']
    
    success = database.add_participant(event_id, user_id)
    if success:
        return jsonify({"status": "joined"})
    return jsonify({"error": "Could not join"}), 400

# ❌ Покинуть событие
@api_bp.route('/leave', methods=['POST'])
def leave_event():
    data = request.json
    event_id = data['event_id']
    user_id = data['user_id']
    
    success = database.remove_participant(event_id, user_id)
    if success:
        return jsonify({"status": "left"})
    return jsonify({"error": "Could not leave"}), 400

# 👥 Получить участников события
@api_bp.route('/participants/<event_id>', methods=['GET'])
def get_participants(event_id):
    participants = database.get_participants(event_id)
    return jsonify(participants)

# 👤 Получить профиль пользователя (с ачивками!)
@api_bp.route('/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    vibe = database.get_user_vibe(user_id)
    if vibe:
        return jsonify(vibe)
    return jsonify({"error": "User not found"}), 404

# 📊 Рейтинг активности
@api_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    users = database.users_db.values()
    leaderboard = []
    
    for user in users:
        vibe = database.get_user_vibe(user['id'])
        if vibe:
            score = vibe['stats']['created'] * 3 + vibe['stats']['attended'] * 1
            leaderboard.append({
                "user": user,
                "score": score,
                "achievements": len(vibe['achievements']),
                "stats": vibe['stats']
            })
    
    leaderboard.sort(key=lambda x: x['score'], reverse=True)
    return jsonify(leaderboard)
