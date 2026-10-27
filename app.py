"""
==============================================================================
GRAND HORIZON LUXURY HOTEL - Python Flask Backend (Optional Backend Server)
File: backend/app.py
Database: SQLite 3 (hotel.db)
==============================================================================
"""

import os
import sqlite3
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
DB_PATH = os.path.join(PARENT_DIR, "hotel.db")

app = Flask(__name__, static_folder=PARENT_DIR)
CORS(app)


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/")
def index():
    """Serves the front-end SPA directly from the root project directory."""
    return send_from_directory(PARENT_DIR, "index.html")


@app.route("/<path:path>")
def static_proxy(path):
    """Serves static files (css, js, images)."""
    return send_from_directory(PARENT_DIR, path)


@app.route("/api/rooms", methods=["GET"])
def get_rooms():
    """Query rooms filtered by guest capacity and calculate availability."""
    guests = request.args.get("guests", default=1, type=int)
    check_in = request.args.get("check_in", default="")
    check_out = request.args.get("check_out", default="")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM rooms WHERE capacity >= ? ORDER BY price ASC", (guests,))
    rooms = [dict(row) for row in cursor.fetchall()]

    for r in rooms:
        if check_in and check_out:
            cursor.execute("""
                SELECT COUNT(*) as booked 
                FROM bookings 
                WHERE room_id = ? 
                  AND status = 'CONFIRMED'
                  AND check_in < ? 
                  AND check_out > ?
            """, (r["id"], check_out, check_in))
            booked = cursor.fetchone()["booked"]
            r["available"] = max(r["total"] - booked, 0)
        else:
            r["available"] = r["total"]

    conn.close()
    return jsonify({"success": True, "rooms": rooms})


@app.route("/api/book", methods=["POST"])
def create_booking():
    """Process a new room reservation and save to SQLite."""
    data = request.json or {}
    room_id = data.get("room_id")
    guest_name = data.get("guest_name", "").strip()
    guest_email = data.get("guest_email", "").strip()
    guest_phone = data.get("guest_phone", "").strip()
    check_in = data.get("check_in", "")
    check_out = data.get("check_out", "")
    guests = int(data.get("guests", 1))

    if not all([room_id, guest_name, guest_email, guest_phone, check_in, check_out]):
        return jsonify({"success": False, "message": "Missing required booking fields"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check room exists
    cursor.execute("SELECT * FROM rooms WHERE id = ?", (room_id,))
    room = cursor.fetchone()
    if not room:
        conn.close()
        return jsonify({"success": False, "message": "Selected room does not exist"}), 404

    # Check availability
    cursor.execute("""
        SELECT COUNT(*) as booked 
        FROM bookings 
        WHERE room_id = ? 
          AND status = 'CONFIRMED'
          AND check_in < ? 
          AND check_out > ?
    """, (room_id, check_out, check_in))
    booked = cursor.fetchone()["booked"]
    if room["total"] - booked <= 0:
        conn.close()
        return jsonify({"success": False, "message": "Room is no longer available for selected dates"}), 400

    # Calculate nights & total price
    try:
        d_in = datetime.strptime(check_in, "%Y-%m-%d").date()
        d_out = datetime.strptime(check_out, "%Y-%m-%d").date()
        nights = max((d_out - d_in).days, 1)
    except ValueError:
        nights = 1

    total_price = room["price"] * nights
    confirmation_code = f"GH-{uuid.uuid4().hex[:6].upper()}"

    cursor.execute("""
        INSERT INTO bookings 
        (confirmation_code, room_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total_price, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', datetime('now'))
    """, (confirmation_code, room_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total_price))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "confirmation_code": confirmation_code,
        "nights": nights,
        "total_price": total_price,
        "room_name": room["name"]
    })


@app.route("/api/contact", methods=["POST"])
def submit_contact():
    """Store guest inquiries into SQLite."""
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    subject = data.get("subject", "").strip()
    message = data.get("message", "").strip()

    if not all([name, email, subject, message]):
        return jsonify({"success": False, "message": "All fields are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO contact_messages (name, email, subject, message)
        VALUES (?, ?, ?, ?)
    """, (name, email, subject, message))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Inquiry recorded successfully"})


if __name__ == "__main__":
    print(f"Grand Horizon Hotel server starting at http://127.0.0.1:5000")
    print(f"Connected to SQLite Database: {DB_PATH}")
    app.run(debug=True, port=5000)
