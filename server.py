from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from pathlib import Path
from email.message import EmailMessage
import base64
import hashlib
import hmac
import json
import re
import os
import secrets
import sqlite3
import smtplib
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "hengran.sqlite3"
SESSIONS = {}


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS weight_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                weight_jin REAL NOT NULL,
                delta REAL NOT NULL,
                mood TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS food_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                name TEXT NOT NULL,
                grams REAL NOT NULL,
                kcal REAL NOT NULL,
                estimated INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)


        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY,
                height_cm REAL NOT NULL,
                initial_weight_jin REAL NOT NULL,
                target_weight_jin REAL NOT NULL,
                plan_days INTEGER NOT NULL,
                unit TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)


def ensure_column(conn, table, column, definition):
    columns = [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def migrate_db():
    with db() as conn:
        ensure_column(conn, "users", "openid", "TEXT")
        ensure_column(conn, "users", "client_id", "TEXT")
        ensure_column(conn, "users", "source", "TEXT NOT NULL DEFAULT 'web'")
        ensure_column(conn, "user_profiles", "avatar_url", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "user_profiles", "nickname", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "user_profiles", "birthday", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "user_profiles", "gender", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "user_profiles", "region", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "user_profiles", "city", "TEXT NOT NULL DEFAULT ''")
        ensure_column(conn, "user_profiles", "onboarded", "INTEGER NOT NULL DEFAULT 0")
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_openid ON users(openid)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_weight_user_time ON weight_records(user_id, date, time, id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_food_user_time ON food_records(user_id, date, time, id)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                nickname TEXT NOT NULL DEFAULT '',
                contact TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL,
                page TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

        onboarded_without_weights = conn.execute("""
            SELECT p.user_id, p.initial_weight_jin
            FROM user_profiles p
            WHERE p.onboarded = 1
              AND p.initial_weight_jin > 0
              AND NOT EXISTS (SELECT 1 FROM weight_records w WHERE w.user_id = p.user_id)
        """).fetchall()
        now = time.localtime()
        date_text = time.strftime("%Y-%m-%d", now)
        time_text = time.strftime("%H:%M", now)
        mood = "moon" if now.tm_hour >= 18 else "sun"
        for row in onboarded_without_weights:
            conn.execute(
                "INSERT INTO weight_records (user_id, date, time, weight_jin, delta, mood, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (row["user_id"], date_text, time_text, float(row["initial_weight_jin"]), 0, mood, int(time.time())),
            )

def hash_password(password, salt=None):
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password, stored):
    salt_text, digest_text = stored.split("$", 1)
    salt = base64.b64decode(salt_text)
    expected = base64.b64decode(digest_text)
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return hmac.compare_digest(actual, expected)


def seed_user_records(user_id):
    with db() as conn:
        count = conn.execute("SELECT COUNT(*) AS n FROM weight_records WHERE user_id = ?", (user_id,)).fetchone()["n"]
        if not count:
            rows = [
                (user_id, "2026-05-01", "10:55", 144.7, -1.8, "sun", int(time.time())),
                (user_id, "2026-04-30", "19:30", 146.5, 0, "moon", int(time.time()) - 60),
            ]
            conn.executemany(
                "INSERT INTO weight_records (user_id, date, time, weight_jin, delta, mood, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
        food_count = conn.execute("SELECT COUNT(*) AS n FROM food_records WHERE user_id = ?", (user_id,)).fetchone()["n"]
        if not food_count:
            foods = [
                (user_id, "2026-05-01", "18:15", "鸡胸肉", 100, 120, 0, int(time.time())),
                (user_id, "2026-05-01", "12:15", "面条", 300, 880, 0, int(time.time()) - 60),
            ]
            conn.executemany(
                "INSERT INTO food_records (user_id, date, time, name, grams, kcal, estimated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                foods,
            )


def rows_to_records(rows):
    return [
        {
            "id": row["id"],
            "date": row["date"],
            "time": row["time"],
            "weightJin": row["weight_jin"],
            "delta": row["delta"],
            "mood": row["mood"],
        }
        for row in rows
    ]


def rows_to_foods(rows):
    return [
        {
            "id": row["id"],
            "date": row["date"],
            "time": row["time"],
            "name": row["name"],
            "grams": row["grams"],
            "kcal": row["kcal"],
            "estimated": bool(row["estimated"]),
        }
        for row in rows
    ]



def row_to_profile(row):
    if not row:
        return None
    def get(name, default=""):
        try:
            value = row[name]
        except (KeyError, IndexError):
            return default
        return default if value is None else value
    region_text = get("region", "")
    region = region_text.split("|") if region_text else ["", "", ""]
    return {
        "heightCm": get("height_cm", 0),
        "initialWeightJin": get("initial_weight_jin", 0),
        "targetWeightJin": get("target_weight_jin", 0),
        "planDays": get("plan_days", 0),
        "unit": get("unit", "jin"),
        "avatarUrl": get("avatar_url", ""),
        "nickname": get("nickname", ""),
        "birthday": get("birthday", ""),
        "gender": get("gender", ""),
        "region": region,
        "city": get("city", ""),
        "onboarded": bool(get("onboarded", 0)),
        "updatedAt": get("updated_at", 0),
    }

def clean_ai_text(text):
    text = str(text or "").strip()
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"^[\s>]*[-*]\s+", "", text, flags=re.M)
    text = re.sub(r"^[\s>]*\d+[.?]\s*", "", text, flags=re.M)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip().rstrip("?(?:??")


def extract_ai_text(payload):
    direct = str(payload.get("output_text", "")).strip() if isinstance(payload, dict) else ""
    pieces = []

    def walk(value):
        if isinstance(value, dict):
            text = value.get("text")
            if isinstance(text, str) and text.strip():
                pieces.append(text.strip())
            for key, child in value.items():
                if key != "text":
                    walk(child)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(payload)
    combined = "".join(pieces).strip()
    if combined and len(combined) > len(direct):
        return clean_ai_text(combined)
    return clean_ai_text(direct)

def estimate_kcal(name, grams):
    text = name.lower()
    rates = [
        ("鸡胸", 1.2), ("鸡肉", 1.65), ("面", 2.9), ("米饭", 1.16),
        ("牛肉", 2.5), ("鸡蛋", 1.55), ("苹果", 0.52), ("香蕉", 0.89),
        ("牛奶", 0.54), ("豆腐", 0.76), ("鱼", 1.2), ("沙拉", 0.45),
    ]
    rate = 1.6
    for key, value in rates:
        if key in text:
            rate = value
            break
    return round(float(grams) * rate)


def send_feedback_email(feedback):
    host = os.environ.get("SMTP_HOST", "").strip()
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "").strip()
    to_addr = os.environ.get("FEEDBACK_EMAIL_TO", "").strip()
    if not host or not user or not password or not to_addr:
        return False, "email_not_configured"
    port = int(os.environ.get("SMTP_PORT", "465") or 465)
    from_addr = os.environ.get("SMTP_FROM", user).strip() or user
    use_ssl = os.environ.get("SMTP_SSL", "1").strip() != "0"
    msg = EmailMessage()
    msg["Subject"] = f"\u8861\u71c3\u6536\u5230\u65b0\u53cd\u9988 #{feedback['id']}"
    msg["From"] = from_addr
    msg["To"] = to_addr
    body = "\n".join([
        "\u6536\u5230\u4e00\u6761\u65b0\u7684\u7528\u6237\u53cd\u9988\u3002",
        "",
        f"\u53cd\u9988\u7f16\u53f7\uff1a{feedback['id']}",
        f"\u63d0\u4ea4\u65f6\u95f4\uff1a{feedback['createdText']}",
        f"\u7528\u6237\u6635\u79f0\uff1a{feedback['nickname']}",
        f"\u7528\u6237ID\uff1a{feedback['userId']}",
        f"\u6765\u6e90\u9875\u9762\uff1a{feedback['page']}",
        f"\u8054\u7cfb\u65b9\u5f0f\uff1a{feedback['contact'] or '\u672a\u586b\u5199'}",
        "",
        "\u53cd\u9988\u5185\u5bb9\uff1a",
        str(feedback['content']),
        "",
        "\u672c\u5730\u53cd\u9988\u540e\u53f0\uff1ahttp://127.0.0.1:5174/admin/feedback",
    ])
    msg.set_content(body)
    if use_ssl:
        with smtplib.SMTP_SSL(host, port, timeout=10) as smtp:
            smtp.login(user, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(msg)
    return True, "sent"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/me":
            user = self.current_user()
            if not user:
                return self.json({"error": "未登录"}, 401)
            return self.json({"user": {"id": user["id"], "username": user["username"]}})
        if path == "/api/profile":
            user = self.current_user()
            if not user:
                return self.json({"error": "未登录"}, 401)
            with db() as conn:
                row = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],)).fetchone()
            return self.json({"profile": row_to_profile(row)})
        if path == "/api/weights":
            user = self.current_user()
            if not user:
                return self.json({"error": "未登录"}, 401)
            with db() as conn:
                rows = conn.execute(
                    "SELECT * FROM weight_records WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC",
                    (user["id"],),
                ).fetchall()
            return self.json({"records": rows_to_records(rows)})
        if path == "/api/admin/feedback":
            return self.admin_feedback_json()
        if path == "/admin/feedback":
            return self.admin_feedback_page()
        if path == "/api/foods":
            user = self.current_user()
            if not user:
                return self.json({"error": "未登录"}, 401)
            with db() as conn:
                rows = conn.execute(
                    "SELECT * FROM food_records WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC",
                    (user["id"],),
                ).fetchall()
            return self.json({"foods": rows_to_foods(rows)})
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        data = self.read_json()
        if path == "/api/mp/login":
            return self.mp_login(data)
        if path == "/api/mp/bootstrap":
            return self.mp_bootstrap(data)
        if path == "/api/register":
            return self.register(data)
        if path == "/api/login":
            return self.login(data)
        if path == "/api/logout":
            token = self.token()
            if token:
                SESSIONS.pop(token, None)
            return self.json({"ok": True})
        if path == "/api/profile":
            return self.save_profile(data)
        if path == "/api/mp/profile":
            return self.save_mp_profile(data)
        if path == "/api/weights":
            return self.create_weight(data)
        if path == "/api/mp/weights":
            return self.create_weight(data)
        if path == "/api/weights/update":
            return self.update_weight(data)
        if path == "/api/mp/weights/update":
            return self.update_weight(data)
        if path == "/api/foods":
            return self.create_food(data)
        if path == "/api/mp/foods":
            return self.create_food(data)
        if path == "/api/mp/feedback":
            return self.create_feedback(data)
        if path == "/api/chat":
            return self.chat(data)
        if path == "/api/chat/briefing":
            return self.chat_briefing(data)
        if path == "/api/mp/chat":
            return self.mp_chat(data)
        if path == "/api/mp/chat/briefing":
            return self.mp_chat_briefing(data)
        return self.json({"error": "接口不存在"}, 404)

    def mp_login(self, data):
        client_id = str(data.get("clientId", "")).strip()
        code = str(data.get("code", "")).strip()
        if not client_id and not code:
            return self.json({"error": "缺少登录凭证"}, 400)
        openid = self.resolve_openid(code, client_id)
        username = f"mp:{openid}"
        now = int(time.time())
        with db() as conn:
            user = conn.execute("SELECT * FROM users WHERE openid = ?", (openid,)).fetchone()
            if not user:
                cursor = conn.execute(
                    "INSERT INTO users (username, password_hash, created_at, openid, client_id, source) VALUES (?, ?, ?, ?, ?, ?)",
                    (username, hash_password(secrets.token_urlsafe(12)), now, openid, client_id, "wechat_mp"),
                )
                user_id = cursor.lastrowid
            else:
                user_id = user["id"]
                conn.execute("UPDATE users SET client_id = ? WHERE id = ?", (client_id, user_id))
        token = self.make_session(user_id)
        return self.json({"token": token, "user": {"id": user_id, "openid": openid}})

    def resolve_openid(self, code, client_id):
        app_id = os.environ.get("WECHAT_APP_ID", "").strip()
        app_secret = os.environ.get("WECHAT_APP_SECRET", "").strip()
        if app_id and app_secret and code:
            url = "https://api.weixin.qq.com/sns/jscode2session?appid={}&secret={}&js_code={}&grant_type=authorization_code".format(app_id, app_secret, code)
            try:
                with urllib.request.urlopen(url, timeout=8) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
                if payload.get("openid"):
                    return payload["openid"]
            except Exception:
                pass
        stable = client_id or code or secrets.token_hex(8)
        return "dev_" + hashlib.sha256(stable.encode("utf-8")).hexdigest()[:24]

    def mp_bootstrap(self, data):
        user = self.current_user()
        if not user:
            return self.json({"error": "请先登录"}, 401)
        with db() as conn:
            profile_row = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],)).fetchone()
            existing_weight = conn.execute("SELECT COUNT(*) AS n FROM weight_records WHERE user_id = ?", (user["id"],)).fetchone()["n"]
            if profile_row and not existing_weight and int(profile_row["onboarded"] or 0) and float(profile_row["initial_weight_jin"] or 0) > 0:
                now_row = time.localtime()
                conn.execute(
                    "INSERT INTO weight_records (user_id, date, time, weight_jin, delta, mood, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (user["id"], time.strftime("%Y-%m-%d", now_row), time.strftime("%H:%M", now_row), float(profile_row["initial_weight_jin"]), 0, "moon" if now_row.tm_hour >= 18 else "sun", int(time.time())),
                )
            profile_row = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],)).fetchone()
            weights = conn.execute("SELECT * FROM weight_records WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC", (user["id"],)).fetchall()
            foods = conn.execute("SELECT * FROM food_records WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC", (user["id"],)).fetchall()
        profile = row_to_profile(profile_row)
        return self.json({
            "user": {"id": user["id"], "username": user["username"]},
            "isNew": not bool(profile and profile.get("onboarded")),
            "profile": profile,
            "weights": rows_to_records(weights),
            "foods": rows_to_foods(foods),
        })

    def save_mp_profile(self, data):
        user = self.current_user()
        if not user:
            return self.json({"error": "请先登录"}, 401)
        old = None
        with db() as conn:
            old = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],)).fetchone()
        old_profile = row_to_profile(old) or {}
        def num(name):
            value = data.get(name, old_profile.get(name, 0))
            try:
                return float(value or 0)
            except (TypeError, ValueError):
                return 0
        def intval(name):
            value = data.get(name, old_profile.get(name, 0))
            try:
                return int(float(value or 0))
            except (TypeError, ValueError):
                return 0
        height_cm = num("heightCm")
        initial_weight_jin = num("initialWeightJin")
        target_weight_jin = num("targetWeightJin")
        plan_days = intval("planDays")
        unit = str(data.get("unit", old_profile.get("unit", "jin")) or "jin")
        if unit not in ("jin", "kg"):
            unit = "jin"
        avatar_url = str(data.get("avatarUrl", old_profile.get("avatarUrl", "")) or "")
        nickname = str(data.get("nickname", old_profile.get("nickname", "")) or "")
        birthday = str(data.get("birthday", old_profile.get("birthday", "")) or "")
        gender = str(data.get("gender", old_profile.get("gender", "")) or "")
        region_value = data.get("region", old_profile.get("region", []))
        region = "|".join(region_value) if isinstance(region_value, list) else str(region_value or "")
        city = str(data.get("city", old_profile.get("city", "")) or "")
        onboarded = 1 if height_cm > 0 and initial_weight_jin > 0 and target_weight_jin > 0 and plan_days > 0 else 0
        with db() as conn:
            conn.execute(
                "INSERT INTO user_profiles (user_id, height_cm, initial_weight_jin, target_weight_jin, plan_days, unit, avatar_url, nickname, birthday, gender, region, city, onboarded, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET height_cm = excluded.height_cm, initial_weight_jin = excluded.initial_weight_jin, target_weight_jin = excluded.target_weight_jin, plan_days = excluded.plan_days, unit = excluded.unit, avatar_url = excluded.avatar_url, nickname = excluded.nickname, birthday = excluded.birthday, gender = excluded.gender, region = excluded.region, city = excluded.city, onboarded = excluded.onboarded, updated_at = excluded.updated_at",
                (user["id"], height_cm, initial_weight_jin, target_weight_jin, plan_days, unit, avatar_url, nickname, birthday, gender, region, city, onboarded, int(time.time())),
            )
            if onboarded and initial_weight_jin > 0:
                existing_weight = conn.execute("SELECT COUNT(*) AS n FROM weight_records WHERE user_id = ?", (user["id"],)).fetchone()["n"]
                if not existing_weight:
                    now_row = time.localtime()
                    conn.execute(
                        "INSERT INTO weight_records (user_id, date, time, weight_jin, delta, mood, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (user["id"], time.strftime("%Y-%m-%d", now_row), time.strftime("%H:%M", now_row), initial_weight_jin, 0, "moon" if now_row.tm_hour >= 18 else "sun", int(time.time())),
                    )
            row = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],)).fetchone()
            weights = conn.execute("SELECT * FROM weight_records WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC", (user["id"],)).fetchall()
        return self.json({"profile": row_to_profile(row), "weights": rows_to_records(weights), "isNew": not bool(onboarded)})

    def create_feedback(self, data):
        user = self.current_user()
        if not user:
            return self.json({"error": "请先登录"}, 401)
        content = str(data.get("content", "")).strip()
        if len(content) < 1:
            return self.json({"error": "请写下反馈内容"}, 400)
        profile = None
        with db() as conn:
            profile = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],)).fetchone()
            nickname = (row_to_profile(profile) or {}).get("nickname") or user["username"]
            cursor = conn.execute(
                "INSERT INTO feedback (user_id, nickname, contact, content, page, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user["id"], nickname, str(data.get("contact", "") or ""), content, str(data.get("page", "") or "profile"), int(time.time())),
            )
            row = conn.execute("SELECT * FROM feedback WHERE id = ?", (cursor.lastrowid,)).fetchone()
        feedback = self.feedback_row(row)
        email_sent = False
        try:
            email_sent, _ = send_feedback_email(feedback)
        except Exception as error:
            print(f"Feedback email failed: {error}")
        return self.json({"feedback": feedback, "emailSent": email_sent}, 201)

    def feedback_row(self, row):
        return {
            "id": row["id"],
            "userId": row["user_id"],
            "nickname": row["nickname"],
            "contact": row["contact"],
            "content": row["content"],
            "page": row["page"],
            "createdAt": row["created_at"],
            "createdText": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(row["created_at"])),
        }

    def admin_feedback_json(self):
        with db() as conn:
            rows = conn.execute("SELECT * FROM feedback ORDER BY id DESC LIMIT 200").fetchall()
        return self.json({"feedback": [self.feedback_row(row) for row in rows]})

    def admin_feedback_page(self):
        with db() as conn:
            rows = conn.execute("SELECT * FROM feedback ORDER BY id DESC LIMIT 200").fetchall()
        cards = []
        for row in rows:
            item = self.feedback_row(row)
            content = (item["content"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
            cards.append(f"<div class='card'><div class='meta'>#{item['id']} ? {item['createdText']} ? {item['nickname']}</div><div class='content'>{content}</div></div>")
        body = "".join(cards) or "<div class='empty'>还没有收到反馈。</div>"
        html = f"""<!doctype html><html><head><meta charset='utf-8'><title>衡燃反馈后台</title><style>body{{margin:0;background:#eaf7ff;font-family:Arial,'Microsoft YaHei',sans-serif;color:#111}}header{{background:#147CFF;color:white;padding:28px 36px}}h1{{margin:0;font-size:30px}}main{{max-width:880px;margin:24px auto;padding:0 18px}}.card{{background:white;border-radius:14px;padding:18px 22px;margin-bottom:14px;box-shadow:0 8px 24px rgba(20,124,255,.08)}}.meta{{color:#6b7280;font-weight:700;margin-bottom:10px}}.content{{font-size:18px;line-height:1.6;white-space:pre-wrap}}.empty{{background:white;border-radius:14px;padding:36px;text-align:center;color:#777}}</style></head><body><header><h1>衡燃反馈后台</h1><p>衡燃反馈后台衡燃反馈后台衡燃反馈后台?</p></header><main>{body}</main></body></html>"""
        raw = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def ensure_initial_weight_record(self, conn, user_id):
        row = conn.execute(
            """
            SELECT p.initial_weight_jin AS initial_weight_jin
            FROM user_profiles p
            WHERE p.user_id = ?
              AND p.onboarded = 1
              AND p.initial_weight_jin > 0
              AND NOT EXISTS (SELECT 1 FROM weight_records w WHERE w.user_id = p.user_id)
            """,
            (user_id,),
        ).fetchone()
        if not row:
            return
        initial_weight = float(row["initial_weight_jin"])
        now = time.localtime()
        date_text = time.strftime("%Y-%m-%d", now)
        time_text = time.strftime("%H:%M", now)
        mood = "moon" if now.tm_hour >= 18 else "sun"
        conn.execute(
            "INSERT INTO weight_records (user_id, date, time, weight_jin, delta, mood, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, date_text, time_text, initial_weight, 0, mood, int(time.time())),
        )


    def recalc_user_weight_deltas(self, conn, user_id):
        rows = conn.execute("SELECT * FROM weight_records WHERE user_id = ? ORDER BY date ASC, time ASC, id ASC", (user_id,)).fetchall()
        previous = None
        for row in rows:
            delta = round(float(row["weight_jin"]) - float(previous["weight_jin"]), 1) if previous else 0
            conn.execute("UPDATE weight_records SET delta = ? WHERE id = ?", (delta, row["id"]))
            previous = row

    def register(self, data):
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))
        if len(username) < 2 or len(password) < 6:
            return self.json({"error": "用户名至少2位，密码至少6位"}, 400)
        try:
            with db() as conn:
                cursor = conn.execute(
                    "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
                    (username, hash_password(password), int(time.time())),
                )
                user_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            return self.json({"error": "这个用户名已经注册过"}, 409)
        token = self.make_session(user_id)
        return self.json({"token": token, "user": {"id": user_id, "username": username}})

    def login(self, data):
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))
        with db() as conn:
            user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            return self.json({"error": "用户名或密码不正确"}, 401)
        token = self.make_session(user["id"])
        return self.json({"token": token, "user": {"id": user["id"], "username": user["username"]}})

    def save_profile(self, data):
        user = self.current_user()
        if not user:
            return self.json({"error": "请先登录"}, 401)
        try:
            height_cm = float(data.get("heightCm"))
            initial_weight_jin = float(data.get("initialWeightJin"))
            target_weight_jin = float(data.get("targetWeightJin"))
            plan_days = int(data.get("planDays"))
        except (TypeError, ValueError):
            return self.json({"error": "建档信息格式不正确"}, 400)
        unit = str(data.get("unit", "jin")).strip() or "jin"
        if height_cm <= 0 or initial_weight_jin <= 0 or target_weight_jin <= 0 or plan_days <= 0:
            return self.json({"error": "请填写完整的建档信息"}, 400)
        if unit not in ("jin", "kg"):
            unit = "jin"
        with db() as conn:
            conn.execute(
                "INSERT INTO user_profiles (user_id, height_cm, initial_weight_jin, target_weight_jin, plan_days, unit, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET height_cm = excluded.height_cm, initial_weight_jin = excluded.initial_weight_jin, target_weight_jin = excluded.target_weight_jin, plan_days = excluded.plan_days, unit = excluded.unit, updated_at = excluded.updated_at",
                (user["id"], height_cm, initial_weight_jin, target_weight_jin, plan_days, unit, int(time.time())),
            )
            row = conn.execute("SELECT * FROM user_profiles WHERE user_id = ?", (user["id"],)).fetchone()
        return self.json({"profile": row_to_profile(row)})
    def create_weight(self, data):
        user = self.current_user()
        if not user:
            return self.json({"error": "请先登录"}, 401)
        try:
            weight_jin = float(data.get("weightJin"))
        except (TypeError, ValueError):
            return self.json({"error": "体重格式不正确"}, 400)
        date = str(data.get("date", "")).strip()
        if not date:
            return self.json({"error": "请选择日期"}, 400)
        now = time.localtime()
        time_text = time.strftime("%H:%M", now)
        mood = "moon" if now.tm_hour >= 18 else "sun"
        with db() as conn:
            previous = conn.execute(
                "SELECT weight_jin FROM weight_records WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC LIMIT 1",
                (user["id"],),
            ).fetchone()
            delta = round(weight_jin - previous["weight_jin"], 1) if previous else 0
            cursor = conn.execute(
                "INSERT INTO weight_records (user_id, date, time, weight_jin, delta, mood, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (user["id"], date, time_text, weight_jin, delta, mood, int(time.time())),
            )
            self.recalc_user_weight_deltas(conn, user["id"])
            row = conn.execute("SELECT * FROM weight_records WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return self.json({"record": rows_to_records([row])[0]}, 201)

    def update_weight(self, data):
        user = self.current_user()
        if not user:
            return self.json({"error": "请先登录"}, 401)
        try:
            record_id = int(data.get("id"))
            weight_jin = float(data.get("weightJin"))
        except (TypeError, ValueError):
            return self.json({"error": "记录或体重格式不正确"}, 400)
        with db() as conn:
            current = conn.execute(
                "SELECT * FROM weight_records WHERE id = ? AND user_id = ?",
                (record_id, user["id"]),
            ).fetchone()
            if not current:
                return self.json({"error": "记录不存在"}, 404)
            previous = conn.execute(
                "SELECT weight_jin FROM weight_records WHERE user_id = ? AND (date < ? OR (date = ? AND time < ?) OR (date = ? AND time = ? AND id < ?)) ORDER BY date DESC, time DESC, id DESC LIMIT 1",
                (user["id"], current["date"], current["date"], current["time"], current["date"], current["time"], record_id),
            ).fetchone()
            delta = round(weight_jin - previous["weight_jin"], 1) if previous else 0
            conn.execute(
                "UPDATE weight_records SET weight_jin = ?, delta = ? WHERE id = ? AND user_id = ?",
                (weight_jin, delta, record_id, user["id"]),
            )
            self.recalc_user_weight_deltas(conn, user["id"])
            row = conn.execute("SELECT * FROM weight_records WHERE id = ?", (record_id,)).fetchone()
        return self.json({"record": rows_to_records([row])[0]})

    def create_food(self, data):
        user = self.current_user()
        if not user:
            return self.json({"error": "请先登录"}, 401)
        name = str(data.get("name", "")).strip()
        date = str(data.get("date", "")).strip()
        try:
            grams = float(data.get("grams"))
        except (TypeError, ValueError):
            return self.json({"error": "克数格式不正确"}, 400)
        if not name or not date:
            return self.json({"error": "请填写食物和日期"}, 400)
        raw_kcal = data.get("kcal")
        estimated = 0
        try:
            kcal = float(raw_kcal) if raw_kcal not in (None, "") else None
        except (TypeError, ValueError):
            kcal = None
        if kcal is None:
            kcal = estimate_kcal(name, grams)
            estimated = 1
        now = time.localtime()
        time_text = time.strftime("%H:%M", now)
        with db() as conn:
            cursor = conn.execute(
                "INSERT INTO food_records (user_id, date, time, name, grams, kcal, estimated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (user["id"], date, time_text, name, grams, kcal, estimated, int(time.time())),
            )
            row = conn.execute("SELECT * FROM food_records WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return self.json({"food": rows_to_foods([row])[0]}, 201)

    def user_snapshot(self, user_id):
        with db() as conn:
            weights = conn.execute(
                "SELECT date, time, weight_jin, delta FROM weight_records WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC LIMIT 8",
                (user_id,),
            ).fetchall()
            foods = conn.execute(
                "SELECT date, time, name, grams, kcal FROM food_records WHERE user_id = ? ORDER BY date DESC, time DESC, id DESC LIMIT 8",
                (user_id,),
            ).fetchall()
        weight_text = "；".join([f"{row['date']} {row['time']} {row['weight_jin']:.1f}斤，变化{row['delta']:+.1f}斤" for row in weights]) or "暂无体重记录"
        food_text = "；".join([f"{row['date']} {row['time']} {row['name']} {row['grams']:.0f}g {row['kcal']:.0f}kcal" for row in foods]) or "暂无饮食记录"
        return f"最近体重：{weight_text}\n最近饮食：{food_text}"

    def month_snapshot(self, user_id):
        now = time.localtime()
        month_prefix = time.strftime("%Y-%m", now)
        month_name = f"{now.tm_mon}月"
        with db() as conn:
            weights = conn.execute(
                "SELECT date, time, weight_jin, delta FROM weight_records WHERE user_id = ? AND date LIKE ? ORDER BY date ASC, time ASC, id ASC",
                (user_id, month_prefix + "-%"),
            ).fetchall()
            foods = conn.execute(
                "SELECT date, time, name, grams, kcal FROM food_records WHERE user_id = ? AND date LIKE ? ORDER BY date DESC, time DESC, id DESC LIMIT 8",
                (user_id, month_prefix + "-%"),
            ).fetchall()
        check_days = len(set(row["date"] for row in weights))
        loss_days = len([row for row in weights if float(row["delta"] or 0) < 0])
        gain_days = len([row for row in weights if float(row["delta"] or 0) > 0])
        change = 0
        if len(weights) >= 2:
            change = round(float(weights[-1]["weight_jin"]) - float(weights[0]["weight_jin"]), 1)
        weight_text = "；".join([f"{row['date']} {row['weight_jin']:.1f}斤，变化{row['delta']:+.1f}斤" for row in weights[-8:]]) or "本月暂无体重记录"
        food_text = "；".join([f"{row['date']} {row['name']} {row['grams']:.0f}g {row['kcal']:.0f}kcal" for row in foods]) or "本月暂无饮食记录"
        return {
            "month": month_name,
            "weekday": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][now.tm_wday],
            "hour": now.tm_hour,
            "current_date": current_date,
            "current_time": current_time,
            "request_seed": request_seed,
            "check_days": check_days,
            "loss_days": loss_days,
            "gain_days": gain_days,
            "change": change,
            "weights": weight_text,
            "foods": food_text,
        }

    def fallback_briefing(self, snapshot):
        hour = snapshot["hour"]
        seed = int(time.time()) + int(snapshot.get("check_days", 0)) * 7 + int(snapshot.get("gain_days", 0)) * 11
        morning = ["早上好！今天先把节奏立住~", "早呀！新一天从一次记录开始~", "早上好！今天也慢慢变轻~"]
        afternoon = ["下午好！今天也稳稳推进~", "下午好！小衡来陪你看记录~", "下午好！别急，节奏比速度重要~"]
        evening = ["晚上好！今天辛苦啦~", "下班时间快到了，今晚稳稳吃~", "晚上好！今天也给自己一个交代~"]
        greetings = morning if hour < 12 else afternoon if hour < 18 else evening
        greeting = greetings[seed % len(greetings)]
        change = snapshot["change"]
        change_text = f"已减{abs(change):.1f}斤" if change < 0 else f"增加{change:.1f}斤" if change > 0 else "体重保持稳定"
        summaries = [
            f"{snapshot['month']}已有{snapshot['check_days']}天打卡，{change_text}，继续抓住节奏。",
            f"{snapshot['month']}记录了{snapshot['check_days']}天，{change_text}，今天也别断档。",
            f"{snapshot['month']}先留下记录，{change_text}，小变化也值得看见。",
        ]
        topic_sets = [
            ["晚餐怎么吃更适合减脂？", "体重突然上涨该怎么看？", "平台期应该怎么调整？"],
            ["夜宵想吃时怎么办？", "一周称几次体重合适？", "减脂期早餐怎么搭？"],
            ["运动后体重涨正常吗？", "外卖怎么选更稳？", "掉秤慢要不要少吃？"],
            ["喝水会影响体重吗？", "碳水是不是不能吃？", "今天热量超了怎么办？"],
        ]
        return {
            "greeting": greeting,
            "summary": summaries[(seed // 3) % len(summaries)],
            "reportTitle": f"{snapshot['month']}体重月报",
            "reportSubtitle": "减重小结｜看见每一次记录里的坚持。",
            "topics": topic_sets[seed % len(topic_sets)],
        }

    def call_gemini_prompt(self, prompt, max_tokens=900):
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None, "小衡还没有接上 AI，先用本地建议陪你聊。"
        preferred = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash").strip()
        models = []
        for model in [preferred, "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"]:
            if model and model not in models:
                models.append(model)
        last_error = ""
        for model in models:
            payload = {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": max_tokens},
            }
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            request = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
                method="POST",
            )
            for attempt in range(2):
                try:
                    with urllib.request.urlopen(request, timeout=18) as response:
                        data = json.loads(response.read().decode("utf-8"))
                    text = extract_ai_text(data)
                    if text:
                        return text, None
                    last_error = "AI 没有返回内容"
                    break
                except urllib.error.HTTPError as error:
                    last_error = f"AI 接口返回错误：{error.code}"
                    if error.code in (429, 500, 502, 503, 504) and attempt == 0:
                        time.sleep(0.8)
                        continue
                    break
                except Exception:
                    last_error = "小衡现在连不上 AI 服务"
                    break
        return None, "小衡刚刚有点忙，我先根据你的记录给一个稳妥建议：继续保持固定时间记录体重，饮食优先看总热量和蛋白质，别被单日波动影响节奏。"

    def call_gemini(self, message, snapshot, history):
        history_text = "\n".join([f"{item.get('role', 'user')}: {item.get('text', '')}" for item in history[-6:]])
        prompt = (
            "你是体重管理应用“衡燃”里的 AI 助手小衡。你要用温和、简短、具体的中文回复用户。"
            "可以基于用户体重和饮食记录给减脂、饮食、运动、打卡建议，但不要做医疗诊断，遇到疾病、极端节食、进食障碍风险要建议咨询专业医生。"
            "回复控制在100到140字以内，最多两段。不要 Markdown，不要加粗符号，不要编号列表。"
            "必须把句子说完整，不要在半句话、括号、冒号、逗号后中断。像手机聊天一样自然。\n\n"
            f"用户数据：\n{snapshot}\n\n最近对话：\n{history_text}\n\n用户这次说：{message}"
        )
        return self.call_gemini_prompt(prompt, 1400)

    def chat(self, data):
        user = self.current_user()
        if not user:
            return self.json({"error": "请先登录后再和小衡聊天"}, 401)
        message = str(data.get("message", "")).strip()
        history = data.get("history", [])
        if not message:
            return self.json({"error": "请输入想问小衡的话"}, 400)
        if len(message) > 500:
            return self.json({"error": "消息太长啦，先拆成短一点的问题"}, 400)
        snapshot = self.user_snapshot(user["id"])
        reply, fallback = self.call_gemini(message, snapshot, history if isinstance(history, list) else [])
        return self.json({"reply": reply or fallback})
    def chat_briefing(self, data):
        user = self.current_user()
        if not user:
            return self.json({"error": "请先登录后再生成小衡日报"}, 401)
        snapshot = self.month_snapshot(user["id"])
        fallback = self.fallback_briefing(snapshot)
        prompt = (
            "你是体重管理应用“衡燃”的 AI 文案助手。请严格按下面7行输出，不要 Markdown，不要多余解释：\n"
            "GREETING=一句根据当前小时生成的问候，20字以内\n"
            "SUMMARY=本月打卡和体重变化鼓励文案，45字以内\n"
            "TITLE=当月月报标题，必须包含月份\n"
            "SUBTITLE=月报副标题，28字以内\n"
            "TOPIC1=适合点击讨论的减肥话题，18字以内\n"
            "TOPIC2=适合点击讨论的减肥话题，18字以内\n"
            "TOPIC3=适合点击讨论的减肥话题，18字以内\n"
            "语言要活泼但不要夸张，不要医疗诊断。\n\n"
            f"当前时间信息：{snapshot['current_date']} {snapshot['current_time']}，{snapshot['month']}，{snapshot['weekday']}，{snapshot['hour']}点。请求编号：{snapshot['request_seed']}。\\n"
            f"本月统计：打卡{snapshot['check_days']}天，减重记录{snapshot['loss_days']}天，增重记录{snapshot['gain_days']}天，阶段变化{snapshot['change']:+.1f}斤。\n"
            f"体重记录：{snapshot['weights']}\n饮食记录：{snapshot['foods']}"
        )
        reply, error = self.call_gemini_prompt(prompt, 800)
        if reply:
            fields = {}
            for line in reply.replace("\r", "\n").split("\n"):
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip().upper()
                value = value.strip().strip('"').strip("'")
                if key and value:
                    fields[key] = value
            topics = [fields.get("TOPIC1"), fields.get("TOPIC2"), fields.get("TOPIC3")]
            topics = [item for item in topics if item]
            if fields.get("GREETING") or fields.get("SUMMARY") or topics:
                return self.json({
                    "greeting": fields.get("GREETING", fallback["greeting"]),
                    "summary": fields.get("SUMMARY", fallback["summary"]),
                    "reportTitle": fields.get("TITLE", fallback["reportTitle"]),
                    "reportSubtitle": fields.get("SUBTITLE", fallback["reportSubtitle"]),
                    "topics": topics[:3] or fallback["topics"],
                })
        return self.json(fallback)

    def mp_snapshot(self, data):
        now = time.localtime()
        stats = data.get("stats", {}) if isinstance(data.get("stats", {}), dict) else {}
        current_date = str(stats.get("currentDate") or time.strftime("%Y-%m-%d", now))
        current_time = str(stats.get("currentTime") or time.strftime("%H:%M:%S", now))
        request_seed = str(stats.get("requestSeed") or time.time())
        weights = data.get("weights", []) if isinstance(data.get("weights", []), list) else []
        foods = data.get("foods", []) if isinstance(data.get("foods", []), list) else []
        month_prefix = time.strftime("%Y-%m", now)
        month_weights = [item for item in weights if str(item.get("date", "")).startswith(month_prefix)]
        month_foods = [item for item in foods if str(item.get("date", "")).startswith(month_prefix)]
        month_weights.sort(key=lambda item: f"{item.get('date', '')} {item.get('time', '')}")
        change = 0
        if len(month_weights) >= 2:
            change = round(float(month_weights[-1].get("weightJin", 0)) - float(month_weights[0].get("weightJin", 0)), 1)
        weight_text = "；".join([
            f"{item.get('date')} {float(item.get('weightJin', 0)):.1f}斤，变化{float(item.get('delta', 0)):+.1f}斤"
            for item in month_weights[-8:]
        ]) or "本月暂无体重记录"
        food_text = "；".join([
            f"{item.get('date')} {item.get('name', '食物')} {float(item.get('grams', 0)):.0f}g {float(item.get('kcal', 0)):.0f}kcal"
            for item in month_foods[-8:]
        ]) or "本月暂无饮食记录"
        return {
            "month": f"{now.tm_mon}月",
            "weekday": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][now.tm_wday],
            "hour": now.tm_hour,
            "current_date": current_date,
            "current_time": current_time,
            "request_seed": request_seed,
            "check_days": len(set(item.get("date") for item in month_weights if item.get("date"))),
            "loss_days": len([item for item in month_weights if float(item.get("delta", 0)) < 0]),
            "gain_days": len([item for item in month_weights if float(item.get("delta", 0)) > 0]),
            "change": change,
            "weights": weight_text,
            "foods": food_text,
        }

    def mp_chat(self, data):
        message = str(data.get("message", "")).strip()
        history = data.get("history", [])
        if not message:
            return self.json({"error": "请输入想问小衡的话"}, 400)
        snapshot = self.mp_snapshot(data)
        reply, fallback = self.call_gemini(message, snapshot, history if isinstance(history, list) else [])
        return self.json({"reply": reply or fallback})

    def mp_chat_briefing(self, data):
        snapshot = self.mp_snapshot(data)
        fallback = self.fallback_briefing(snapshot)
        prompt = (
            "你是体重管理应用“衡燃”的 AI 文案助手。请严格按下面7行输出，不要 Markdown，不要多余解释：\n"
            "GREETING=一句根据当前小时生成的问候，20字以内\n"
            "SUMMARY=本月打卡和体重变化鼓励文案，45字以内\n"
            "TITLE=当月月报标题，必须包含月份\n"
            "SUBTITLE=月报副标题，28字以内\n"
            "TOPIC1=适合点击讨论的减肥话题，18字以内\n"
            "TOPIC2=适合点击讨论的减肥话题，18字以内\n"
            "TOPIC3=适合点击讨论的减肥话题，18字以内\n"
            "语言要像手机 App 里的小助手，具体、自然、别空喊口号。每次都要根据当前完整日期时间重新组织措辞，不要照抄示例固定句。\\n\\n"
            f"当前时间信息：{snapshot['current_date']} {snapshot['current_time']}，{snapshot['month']}，{snapshot['weekday']}，{snapshot['hour']}点。请求编号：{snapshot['request_seed']}。\\n"
            f"本月统计：打卡{snapshot['check_days']}天，减重记录{snapshot['loss_days']}天，增重记录{snapshot['gain_days']}天，阶段变化{snapshot['change']:+.1f}斤。\n"
            f"体重记录：{snapshot['weights']}\n饮食记录：{snapshot['foods']}"
        )
        reply, error = self.call_gemini_prompt(prompt, 800)
        if reply:
            fields = {}
            for line in reply.replace("\r", "\n").split("\n"):
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                fields[key.strip().upper()] = value.strip().strip('"').strip("'")
            topics = [fields.get("TOPIC1"), fields.get("TOPIC2"), fields.get("TOPIC3")]
            topics = [item for item in topics if item]
            topic_text = "".join(topics[:3])
            is_fixed_topics = "\u665a\u9910" in topic_text and "\u4e0a\u6da8" in topic_text and "\u5e73\u53f0\u671f" in topic_text
            if len(topics) < 3 or is_fixed_topics:
                topics = fallback["topics"]
            summary = fields.get("SUMMARY", fallback["summary"])
            if not summary or summary[-1] not in "\u3002\uff01\uff1f!~":
                summary = fallback["summary"]
            return self.json({
                "greeting": fields.get("GREETING", fallback["greeting"]),
                "summary": summary,
                "reportTitle": fields.get("TITLE", fallback["reportTitle"]),
                "reportSubtitle": fields.get("SUBTITLE", fallback["reportSubtitle"]),
                "topics": topics[:3],
            })
        return self.json(fallback)
    def read_json(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        if not length:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def token(self):
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:]
        return None

    def current_user(self):
        token = self.token()
        user_id = SESSIONS.get(token)
        if not user_id:
            return None
        with db() as conn:
            return conn.execute("SELECT id, username FROM users WHERE id = ?", (user_id,)).fetchone()

    def make_session(self, user_id):
        token = secrets.token_urlsafe(32)
        SESSIONS[token] = user_id
        return token

    def json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    init_db()
    migrate_db()
    server = ThreadingHTTPServer(("localhost", 5174), Handler)
    print("Hengran full-stack demo running at http://localhost:5174")
    server.serve_forever()










