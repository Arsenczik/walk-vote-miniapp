from flask import Blueprint, request, jsonify
import database

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/events', methods=['GET'])
def get_events():
    try:
        return jsonify(database.get_events())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/events', methods=['POST'])
def create_event():
    try:
        data = request.json
        if not data or 'name' not in data or 'creator_id' not in data:
            return jsonify({"error": "name and creator_id are required"}), 400
        event = database.create_event(
            name=data['name'],
            description=data.get('description', ''),
            date=data.get('date', ''),
            creator_id=data['creator_id'],
            category=data.get('category', '🎉'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude')
        )
        return jsonify(event), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/events/<event_id>', methods=['GET'])
def get_event(event_id):
    try:
        event = database.get_event(event_id)
        if event:
            return jsonify(event)
        return jsonify({"error": "Event not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/join', methods=['POST'])
def join_event():
    try:
        data = request.json
        if not data or 'event_id' not in data or 'user_id' not in data:
            return jsonify({"error": "event_id and user_id are required"}), 400
        success = database.add_participant(data['event_id'], data['user_id'])
        if success:
            return jsonify({"status": "joined"})
        return jsonify({"error": "Could not join"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/leave', methods=['POST'])
def leave_event():
    try:
        data = request.json
        if not data or 'event_id' not in data or 'user_id' not in data:
            return jsonify({"error": "event_id and user_id are required"}), 400
        success = database.remove_participant(data['event_id'], data['user_id'])
        if success:
            return jsonify({"status": "left"})
        return jsonify({"error": "Could not leave"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/participants/<event_id>', methods=['GET'])
def get_participants(event_id):
    try:
        return jsonify(database.get_participants(event_id))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    try:
        database.register_user(user_id)
        vibe = database.get_user_vibe(user_id)
        if vibe:
            return jsonify(vibe)
        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- ФОТОГРАФИИ ---
@api_bp.route('/events/<event_id>/photos', methods=['GET'])
def get_photos(event_id):
    try:
        photos = database.get_photos(event_id)
        return jsonify(photos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/events/<event_id>/photos', methods=['POST'])
def add_photo(event_id):
    try:
        data = request.json
        if not data or 'user_id' not in data or 'image' not in data:
            return jsonify({"error": "user_id and image are required"}), 400
        if database.add_photo(event_id, data['image'], data['user_id']):
            return jsonify({"status": "added"})
        return jsonify({"error": "Could not add photo"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
