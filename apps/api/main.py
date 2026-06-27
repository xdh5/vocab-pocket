from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import os
import sqlite3
from typing import Literal

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from word_picker import word_at_point


DATA_DIR = Path(os.environ.get("VOCABULARY_DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
DB_PATH = DATA_DIR / "vocabulary.db"


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    with connect() as database:
        database.execute(
            """
            CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                term TEXT NOT NULL COLLATE NOCASE UNIQUE,
                note TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT 'reading',
                has_listening_speaking INTEGER NOT NULL DEFAULT 0,
                has_reading INTEGER NOT NULL DEFAULT 0,
                add_count INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
            """
        )
        columns = {row[1] for row in database.execute("PRAGMA table_info(words)").fetchall()}
        if "category" not in columns:
            database.execute("ALTER TABLE words ADD COLUMN category TEXT NOT NULL DEFAULT 'reading'")
        if "add_count" not in columns:
            database.execute("ALTER TABLE words ADD COLUMN add_count INTEGER NOT NULL DEFAULT 1")
        added_learning_modes = False
        if "has_listening_speaking" not in columns:
            database.execute("ALTER TABLE words ADD COLUMN has_listening_speaking INTEGER NOT NULL DEFAULT 0")
            added_learning_modes = True
        if "has_reading" not in columns:
            database.execute("ALTER TABLE words ADD COLUMN has_reading INTEGER NOT NULL DEFAULT 0")
            added_learning_modes = True
        if added_learning_modes:
            database.execute(
                """
                UPDATE words
                SET has_listening_speaking = 1,
                    has_reading = CASE WHEN category = 'reading' THEN 1 ELSE 0 END
                """
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Vocabulary API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "null"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WordCreate(BaseModel):
    term: str = Field(min_length=1, max_length=120)
    note: str = Field(default="", max_length=1000)
    category: Literal["listening_speaking", "reading"] = "reading"


class Word(BaseModel):
    id: int
    term: str
    note: str
    category: Literal["listening_speaking", "reading"]
    has_listening_speaking: bool
    has_reading: bool
    add_count: int
    created_at: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/words", response_model=list[Word])
def list_words() -> list[dict]:
    with connect() as database:
        rows = database.execute("SELECT * FROM words ORDER BY id DESC").fetchall()
    return [dict(row) for row in rows]


@app.get("/api/system/word-at-point")
def get_word_at_point(x: int, y: int) -> dict[str, str | int | None]:
    word = word_at_point(x, y)
    add_count = 0
    if word:
        with connect() as database:
            row = database.execute("SELECT add_count FROM words WHERE term = ?", (word,)).fetchone()
            add_count = int(row["add_count"]) if row else 0
    return {"word": word, "add_count": add_count}


@app.post("/api/words", response_model=Word, status_code=status.HTTP_201_CREATED)
def create_word(payload: WordCreate) -> dict:
    term = payload.term.strip()
    if not term:
        raise HTTPException(status_code=422, detail="Word cannot be blank")
    with connect() as database:
        existing = database.execute("SELECT id FROM words WHERE term = ?", (term,)).fetchone()
        if existing:
            if payload.category == "reading":
                database.execute(
                    """
                    UPDATE words
                    SET add_count = add_count + 1, category = ?,
                        has_listening_speaking = 1, has_reading = 1
                    WHERE id = ?
                    """,
                    (payload.category, existing["id"]),
                )
            else:
                database.execute(
                    """
                    UPDATE words
                    SET add_count = add_count + 1, category = ?, has_listening_speaking = 1
                    WHERE id = ?
                    """,
                    (payload.category, existing["id"]),
                )
            row = database.execute("SELECT * FROM words WHERE id = ?", (existing["id"],)).fetchone()
        else:
            has_reading = int(payload.category == "reading")
            cursor = database.execute(
                """
                INSERT INTO words (
                    term, note, category, has_listening_speaking, has_reading, add_count, created_at
                ) VALUES (?, ?, ?, 1, ?, 1, ?)
                """,
                (term, payload.note.strip(), payload.category, has_reading, datetime.now(timezone.utc).isoformat()),
            )
            row = database.execute("SELECT * FROM words WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


@app.delete("/api/words/{word_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_word(word_id: int) -> Response:
    with connect() as database:
        cursor = database.execute("DELETE FROM words WHERE id = ?", (word_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Word not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
