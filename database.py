import sqlite3

def init_db():
    conn = sqlite3.connect('vibe.db')
    cursor = conn.cursor()
    
    # Таблица пользователей и их рейтинга
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            points INTEGER DEFAULT 0,
            achievements TEXT DEFAULT ''
        )
    ''')
    
    # Таблица ивентов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            date TEXT,
            location TEXT,
            creator_id INTEGER
        )
    ''')

    # Кто идет на ивент
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS participants (
            event_id INTEGER,
            user_id INTEGER,
            PRIMARY KEY (event_id, user_id)
        )
    ''')
    
    conn.commit()
    conn.close()

def add_user(user_id, username):
    conn = sqlite3.connect('vibe.db')
    cursor = conn.cursor()
    cursor.execute('INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)', (user_id, username))
    conn.commit()
    conn.close()
