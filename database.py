def get_user_vibe(user_id):
    user = get_user(user_id) # твоя функция получения юзера
    events_created = [e for e in events_db if e['creator_id'] == user_id]
    events_attended = [e for e in events_db if user_id in e['participants']]

    achievements = []
    if len(events_created) > 2:
        achievements.append("📢 Заводила")

    # Считаем самую частую категорию событий, куда ходил
    cat_count = {}
    for e in events_attended:
        cat = e.get('category', '🫥')
        cat_count[cat] = cat_count.get(cat, 0) + 1
    if cat_count:
        favorite_cat = max(cat_count, key=cat_count.get)
        cat_achievements = {
            "🍖": "Король Шашлыка",
            "🌊": "Водный маг",
            "🎲": "Повелитель Подземелий"
        }
        if favorite_cat in cat_achievements:
            achievements.append(cat_achievements[favorite_cat])

    return {"name": user["name"], "achievements": achievements}
