"""Local-only SQLite database service for CodeMind conversations."""

from __future__ import annotations

import json
import sqlite3
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

APP_DIR = Path(__file__).parent
DATA_DIR = APP_DIR / "local_data"
DB_PATH = DATA_DIR / "codemind_conversations.sqlite3"
HOST = "127.0.0.1"
PORT = 8787

_server: ThreadingHTTPServer | None = None
_thread: threading.Thread | None = None
_DB_INITIALISED = False


def init_db() -> None:
    """Idempotent: create the schema only once per process lifetime."""
    global _DB_INITIALISED
    if _DB_INITIALISED:
        return
    DATA_DIR.mkdir(exist_ok=True)
    with sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                created_at INTEGER NOT NULL,
                status TEXT NOT NULL,
                mode TEXT,
                language TEXT,
                platform TEXT,
                answer_type TEXT,
                question TEXT,
                code_input TEXT,
                editor_code TEXT,
                response_text TEXT,
                response_html TEXT,
                error_message TEXT,
                payload_json TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_conversations_created_at "
            "ON conversations(created_at DESC)"
        )
    _DB_INITIALISED = True


def save_conversation(item: dict[str, Any]) -> None:
    init_db()
    with sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False) as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO conversations (
                id, created_at, status, mode, language, platform, answer_type,
                question, code_input, editor_code, response_text, response_html,
                error_message, payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item.get("id"),
                int(item.get("createdAt") or 0),
                item.get("status") or "unknown",
                item.get("mode") or "",
                item.get("language") or "",
                item.get("platform") or "",
                item.get("answerType") or "",
                item.get("question") or "",
                item.get("codeInput") or "",
                item.get("editorCode") or "",
                item.get("responseText") or "",
                item.get("responseHtml") or "",
                item.get("errorMessage") or "",
                json.dumps(item, ensure_ascii=False),
            ),
        )


def list_conversations() -> list[dict[str, Any]]:
    init_db()
    with sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False) as conn:
        rows = conn.execute(
            "SELECT payload_json FROM conversations ORDER BY created_at DESC"
        ).fetchall()
    return [json.loads(row[0]) for row in rows]


def clear_conversations() -> None:
    init_db()
    with sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False) as conn:
        conn.execute("DELETE FROM conversations")


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, data: dict[str, Any] | list[Any]) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        origin = self.headers.get("Origin", "")
        allowed_origins = {"http://127.0.0.1:8501", "http://localhost:8501"}
        if origin in allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
        else:
            self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1:8501")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self._send(200, {"ok": True})

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send(200, {"ok": True, "db": str(DB_PATH)})
        elif self.path == "/conversations":
            self._send(200, {"ok": True, "items": list_conversations()})
        else:
            self._send(404, {"ok": False, "error": "Unknown local database route"})

    def do_POST(self) -> None:
        if self.path != "/conversations":
            self._send(404, {"ok": False, "error": "Unknown local database route"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            item = json.loads(self.rfile.read(length).decode("utf-8"))
            save_conversation(item)
            self._send(200, {"ok": True})
        except Exception as exc:
            self._send(500, {"ok": False, "error": str(exc)})

    def do_DELETE(self) -> None:
        if self.path == "/conversations":
            clear_conversations()
            self._send(200, {"ok": True})
        else:
            self._send(404, {"ok": False, "error": "Unknown local database route"})

    def log_message(self, *_: Any) -> None:
        return


def start_local_db_server() -> str:
    global _server, _thread
    init_db()
    if _server:
        return f"http://{HOST}:{PORT}"
    try:
        _server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError:
        return f"http://{HOST}:{PORT}"
    _thread = threading.Thread(target=_server.serve_forever, daemon=True)
    _thread.start()
    return f"http://{HOST}:{PORT}"
