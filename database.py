import aiosqlite
from datetime import datetime

DB_PATH = "votes.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS polls (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                is_daily INTEGER DEFAULT 0
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS votes (
                poll_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                answer TEXT NOT NULL,
                PRIMARY KEY (poll_id, user_id),
                FOREIGN KEY (poll_id) REFERENCES polls(id)
            )
        """)
        await db.commit()

async def create_poll(poll_id: str, title: str, is_daily: bool = False):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO polls (id, title, created_at, is_daily) VALUES (?, ?, ?, ?)",
            (poll_id, title, datetime.now().isoformat(), int(is_daily))
        )
        await db.commit()

async def save_vote(poll_id: str, user_id: int, user_name: str, answer: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO votes (poll_id, user_id, user_name, answer) VALUES (?, ?, ?, ?)",
            (poll_id, user_id, user_name, answer)
        )
        await db.commit()

async def get_polls():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM polls ORDER BY created_at DESC") as cursor:
            polls = await cursor.fetchall()

        result = []
        for poll in polls:
            async with db.execute(
                "SELECT * FROM votes WHERE poll_id = ?", (poll["id"],)
            ) as cursor:
                votes = await cursor.fetchall()

            groups = {"yes": [], "maybe": [], "no": []}
            for v in votes:
                groups[v["answer"]].append({
                    "user_id": v["user_id"],
                    "user_name": v["user_name"]
                })

            result.append({
                "id": poll["id"],
                "title": poll["title"],
                "created_at": poll["created_at"],
                "is_daily": bool(poll["is_daily"]),
                "votes": groups
            })

        return result
