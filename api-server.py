import json
import os
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("API_PORT", "8787"))
DB_PATH = os.environ.get("LEADS_DB_PATH", "mentorloop-leads.db")
ALLOWED_ORIGIN = os.environ.get("CORS_ORIGIN", "*")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mentorloop_leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                plan TEXT NOT NULL,
                currency TEXT NOT NULL,
                course TEXT NOT NULL,
                city TEXT NOT NULL,
                goal TEXT,
                source TEXT DEFAULT 'enrollment-page-react',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def validate_lead(payload):
    required = ["fullName", "email", "phone", "plan", "currency", "course", "city"]
    for key in required:
        value = str(payload.get(key, "")).strip()
        if not value:
            return f"{key} is required"

    email = str(payload.get("email", "")).strip()
    if "@" not in email or "." not in email:
        return "email is invalid"

    if str(payload.get("plan", "")).strip() not in {"starter", "plus", "mentor-pro"}:
        return "plan is invalid"

    if str(payload.get("currency", "")).strip() not in {"INR", "USD"}:
        return "currency is invalid"

    return None


class ApiHandler(BaseHTTPRequestHandler):
    def _set_headers(self, code=200, content_type="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,x-admin-key")
        self.end_headers()

    def _json(self, code, payload):
        self._set_headers(code)
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_OPTIONS(self):
        self._set_headers(204)

    def do_GET(self):
        if self.path.startswith("/api/health"):
            self._json(200, {"status": "ok"})
            return

        if self.path.startswith("/api/leads"):
            conn = get_connection()
            try:
                rows = conn.execute(
                    """
                    SELECT id, full_name, email, phone, plan, currency, course, city, goal, source, created_at
                    FROM mentorloop_leads
                    ORDER BY id DESC
                    LIMIT 100
                    """
                ).fetchall()
                leads = [dict(row) for row in rows]
                self._json(200, {"count": len(leads), "leads": leads})
                return
            finally:
                conn.close()

        self._json(404, {"error": "Not found"})

    def do_POST(self):
        if not self.path.startswith("/api/enroll"):
            self._json(404, {"error": "Not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_length)
            payload = json.loads(raw.decode("utf-8"))
        except Exception:
            self._json(400, {"error": "Invalid JSON payload"})
            return

        error = validate_lead(payload)
        if error:
            self._json(400, {"error": error})
            return

        created_at = datetime.now(timezone.utc).isoformat()
        values = (
            str(payload.get("fullName", "")).strip(),
            str(payload.get("email", "")).strip(),
            str(payload.get("phone", "")).strip(),
            str(payload.get("plan", "")).strip(),
            str(payload.get("currency", "")).strip(),
            str(payload.get("course", "")).strip(),
            str(payload.get("city", "")).strip(),
            str(payload.get("goal", "")).strip(),
            str(payload.get("source", "enrollment-page-react")).strip(),
            created_at,
        )

        conn = get_connection()
        try:
            cursor = conn.execute(
                """
                INSERT INTO mentorloop_leads (
                    full_name, email, phone, plan, currency, course, city, goal, source, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                values,
            )
            conn.commit()
            lead_id = cursor.lastrowid
        finally:
            conn.close()

        self._json(201, {"ok": True, "id": lead_id, "reference": f"ML-{lead_id}", "createdAt": created_at})


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ApiHandler)
    print(f"MentorLoop API running on http://127.0.0.1:{PORT}")
    server.serve_forever()

