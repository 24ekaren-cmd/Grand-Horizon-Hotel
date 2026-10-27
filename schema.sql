-- ==============================================================================
-- GRAND HORIZON LUXURY HOTEL - SQLite Database Schema & Seed Data
-- Database Engine: SQLite 3
-- File: schema.sql
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE (Guest & Customer Accounts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    phone       TEXT NOT NULL,
    password    TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. ROOMS TABLE (Hotel Inventory, Pricing, Specs & Photography)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    description TEXT NOT NULL,
    price       REAL NOT NULL,
    capacity    INTEGER NOT NULL,
    total       INTEGER NOT NULL,
    image_url   TEXT NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. BOOKINGS TABLE (Guest Reservations & Confirmation Codes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    confirmation_code TEXT NOT NULL UNIQUE,
    room_id           INTEGER NOT NULL,
    user_id           INTEGER,
    guest_name        TEXT NOT NULL,
    guest_email       TEXT NOT NULL,
    guest_phone       TEXT NOT NULL,
    check_in          DATE NOT NULL,
    check_out         DATE NOT NULL,
    guests            INTEGER NOT NULL,
    total_price       REAL NOT NULL,
    status            TEXT DEFAULT 'CONFIRMED',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------------------
-- 4. CONTACT MESSAGES TABLE (Guest Inquiries & Feedback)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    subject    TEXT NOT NULL,
    message    TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings (room_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_bookings_confirmation ON bookings (confirmation_code);

-- ------------------------------------------------------------------------------
-- SEED DATA: ROOM INVENTORY & SPECS
-- ------------------------------------------------------------------------------
INSERT INTO rooms (id, name, type, description, price, capacity, total, image_url) VALUES 
(1, 'Standard Room', 'standard', 'Comfortable modern room with a plush queen-size bed, high-speed Wi-Fi, 55" smart TV, and premium en-suite rainfall shower. Ideal for solo travellers or couples on business or leisure.', 99.00, 2, 10, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'),
(2, 'Deluxe Room', 'deluxe', 'Spacious sanctuary featuring a king-size bed, private lounge area, stocked minibar, marble vanity bathroom, and floor-to-ceiling skyline views. Includes artisan bath products.', 179.00, 2, 8, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80'),
(3, 'Superior Suite', 'suite', 'Opulent suite featuring a dedicated living parlour, lavish master bedroom, Italian marble bath with soaking tub, and panoramic corner terrace. Includes complimentary afternoon tea.', 299.00, 3, 5, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80'),
(4, 'Family Suite', 'family', 'Spacious adjoining quarters with two queen beds, kids activity nook, dual bathrooms, smart games console, and connecting room option. Crafted for effortless family holidays.', 219.00, 4, 6, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80'),
(5, 'Executive Club Suite', 'executive', 'Tailored for executive travellers — private workstation, Herman Miller ergonomic chair, complimentary high-floor Club Lounge access with evening cocktails, and 24/7 butler assist.', 399.00, 2, 4, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80'),
(6, 'Presidential Penthouse', 'presidential', 'The apex of hospitality. 2,800 sq ft dual-level penthouse with private elevator, wraparound skyline terrace, private jacuzzi, grand dining salon, and round-the-clock private chef service.', 899.00, 4, 2, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80');

-- ------------------------------------------------------------------------------
-- SEED DATA: DEMO USERS
-- ------------------------------------------------------------------------------
INSERT INTO users (id, name, email, phone, password, created_at) VALUES 
(1, 'Demo Guest', 'demo@grandhorizon.com', '+1 (555) 019-2834', 'password123', '2026-10-01 10:00:00'),
(2, 'Sophia Martinez', 'sophia@example.com', '+1 (555) 432-8765', 'secret123', '2026-10-15 14:30:00');

-- ------------------------------------------------------------------------------
-- SEED DATA: SAMPLE RESERVATION
-- ------------------------------------------------------------------------------
INSERT INTO bookings (id, confirmation_code, room_id, user_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total_price, status, created_at) VALUES 
(1, 'GH-8X2M9K', 2, 1, 'Demo Guest', 'demo@grandhorizon.com', '+1 (555) 019-2834', '2026-11-10', '2026-11-13', 2, 537.00, 'CONFIRMED', '2026-10-20 09:15:00');
