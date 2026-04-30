from flask import Blueprint, request, jsonify
from database import create_event, get_events, join_event, get_participants

api = Blueprint('api', __name__)

@api.route("/events", methods=["GET"])
def events():
    return jsonify(get_events())

@api.route("/events", methods=["POST"])
def add_event():
    data = request.json
    event = create_event(
        data["title"],
        data["date"],
        data["location"],
        data["maps_url"]
    )
    return jsonify(event)

@api.route("/join", methods=["POST"])
def join():
    data = request.json
    join_event(data["event_id"], data["username"])
    return jsonify({"status": "ok"})

@api.route("/participants/<int:event_id>")
def participants(event_id):
    return jsonify(get_participants(event_id))
