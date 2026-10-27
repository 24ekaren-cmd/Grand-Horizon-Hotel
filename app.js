/**
 * ==============================================================================
 * GRAND HORIZON LUXURY HOTEL - Core Application Logic
 * File: js/app.js
 * Database: SQLite (via WebAssembly sql.js) with LocalStorage Sync & DB Export
 * ==============================================================================
 */

// Global State
let db = null;
let currentUser = null;
const searchState = {
  checkIn: '',
  checkOut: '',
  guests: 2
};

// High-Resolution Room Photography
const ROOM_IMAGES = {
  standard: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
  deluxe: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80',
  suite: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  family: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80',
  executive: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
  presidential: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80'
};

// Default Room Inventory
const SEED_ROOMS = [
  {
    name: 'Standard Room',
    type: 'standard',
    desc: 'Comfortable modern room with a plush queen-size bed, high-speed Wi-Fi, 55" smart TV, and premium en-suite rainfall shower. Ideal for solo travellers or couples.',
    price: 99.00,
    capacity: 2,
    total: 10
  },
  {
    name: 'Deluxe Room',
    type: 'deluxe',
    desc: 'Spacious sanctuary featuring a king-size bed, private lounge area, stocked minibar, marble vanity bathroom, and floor-to-ceiling skyline views.',
    price: 179.00,
    capacity: 2,
    total: 8
  },
  {
    name: 'Superior Suite',
    type: 'suite',
    desc: 'Opulent suite featuring a dedicated living parlour, lavish master bedroom, Italian marble bath with soaking tub, and panoramic corner terrace.',
    price: 299.00,
    capacity: 3,
    total: 5
  },
  {
    name: 'Family Suite',
    type: 'family',
    desc: 'Spacious adjoining quarters with two queen beds, kids activity nook, dual bathrooms, smart games console, and connecting room option.',
    price: 219.00,
    capacity: 4,
    total: 6
  },
  {
    name: 'Executive Club Suite',
    type: 'executive',
    desc: 'Tailored for executive travellers — private workstation, Herman Miller ergonomic chair, complimentary high-floor Club Lounge access, and 24/7 butler assist.',
    price: 399.00,
    capacity: 2,
    total: 4
  },
  {
    name: 'Presidential Penthouse',
    type: 'presidential',
    desc: 'The apex of hospitality. 2,800 sq ft dual-level penthouse with private elevator, wraparound skyline terrace, private jacuzzi, and private chef service.',
    price: 899.00,
    capacity: 4,
    total: 2
  }
];

// ==============================================================================
// 1. DATABASE INITIALIZATION & LOCALSTORAGE PERSISTENCE
// ==============================================================================
async function initDatabase() {
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });

    // Check if a saved database exists in localStorage
    const savedDbBase64 = localStorage.getItem('grand_horizon_db');
    if (savedDbBase64) {
      const binaryString = atob(savedDbBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      db = new SQL.Database(bytes);
    } else {
      db = new SQL.Database();
      buildSchemaAndSeed();
    }

    // Hide loader
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');

    // Auto-restore active session if saved
    const savedUser = localStorage.getItem('grand_horizon_session');
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
      enterApp();
    }
  } catch (err) {
    console.error('SQLite initialization failed:', err);
    alert('Failed to initialize SQLite database engine. Please check your internet connection.');
  }
}

function buildSchemaAndSeed() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      capacity INTEGER NOT NULL,
      total INTEGER NOT NULL,
      image_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      confirmation_code TEXT NOT NULL UNIQUE,
      room_id INTEGER NOT NULL,
      user_id INTEGER,
      guest_name TEXT NOT NULL,
      guest_email TEXT NOT NULL,
      guest_phone TEXT NOT NULL,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      guests INTEGER NOT NULL,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'CONFIRMED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed Default Users
  db.run(`
    INSERT INTO users (name, email, phone, password) VALUES 
    ('Demo Guest', 'demo@grandhorizon.com', '+1 (555) 019-2834', 'password123'),
    ('John Doe', 'john@example.com', '+1 (555) 123-4567', 'secret123');
  `);

  // Seed Rooms
  const stmt = db.prepare(`INSERT INTO rooms (name, type, description, price, capacity, total, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  SEED_ROOMS.forEach(r => {
    stmt.run([r.name, r.type, r.desc, r.price, r.capacity, r.total, ROOM_IMAGES[r.type]]);
  });
  stmt.free();

  // Seed sample initial reservation
  db.run(`
    INSERT INTO bookings (confirmation_code, room_id, user_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total_price, status) VALUES 
    ('GH-8X2M9K', 2, 1, 'Demo Guest', 'demo@grandhorizon.com', '+1 (555) 019-2834', '2026-11-10', '2026-11-13', 2, 537.00, 'CONFIRMED');
  `);

  saveDatabaseState();
}

/**
 * Persists the SQLite database into browser LocalStorage as Base64.
 */
function saveDatabaseState() {
  if (!db) return;
  const binaryArray = db.export();
  let binary = '';
  const bytes = new Uint8Array(binaryArray);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  localStorage.setItem('grand_horizon_db', base64);
}

/**
 * Allows the user to download the actual SQLite .db file directly from the browser!
 */
function exportSQLiteDatabase() {
  if (!db) return;
  const binaryArray = db.export();
  const blob = new Blob([binaryArray], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hotel.db';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('hotel.db downloaded successfully!');
}

// ==============================================================================
// 2. AUTHENTICATION & SESSION MANAGEMENT
// ==============================================================================
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  hideAuthMessages();

  if (tab === 'login') {
    document.querySelector('.auth-tab:nth-child(1)').classList.add('active');
    document.getElementById('loginForm').classList.add('active');
  } else {
    document.querySelector('.auth-tab:nth-child(2)').classList.add('active');
    document.getElementById('registerForm').classList.add('active');
  }
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('authSuccess').style.display = 'none';
}

function showAuthSuccess(msg) {
  const el = document.getElementById('authSuccess');
  el.textContent = msg;
  el.style.display = 'block';
  document.getElementById('authError').style.display = 'none';
}

function hideAuthMessages() {
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authSuccess').style.display = 'none';
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const phone = document.getElementById('regPhone').value.trim();
  const pass = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;

  if (pass !== confirm) {
    showAuthError('Passwords do not match.');
    return;
  }
  if (pass.length < 6) {
    showAuthError('Password must contain at least 6 characters.');
    return;
  }

  // Check unique email in SQLite users table
  const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
  checkStmt.bind([email]);
  const exists = checkStmt.step();
  checkStmt.free();

  if (exists) {
    showAuthError('An account with this email address already exists.');
    return;
  }

  // Insert into SQLite
  const insertStmt = db.prepare('INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)');
  insertStmt.run([name, email, phone, pass]);
  insertStmt.free();
  saveDatabaseState();

  showAuthSuccess('Account created successfully! You can now sign in.');
  switchAuthTab('login');
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = '';
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPassword').value;

  const stmt = db.prepare('SELECT id, name, email, phone, password FROM users WHERE email = ?');
  stmt.bind([email]);

  if (!stmt.step()) {
    stmt.free();
    showAuthError('No account found with this email address.');
    return;
  }

  const row = stmt.getAsObject();
  stmt.free();

  if (row.password !== pass) {
    showAuthError('Incorrect password. Please try again.');
    return;
  }

  currentUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone
  };

  localStorage.setItem('grand_horizon_session', JSON.stringify(currentUser));
  enterApp();
}

function enterApp() {
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('appWrapper').style.display = 'block';
  document.getElementById('navUserName').textContent = currentUser.name;
  initDateConstraints();
  navigate('home');
  showToast(`Welcome back, ${currentUser.name}!`);
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('grand_horizon_session');
  document.getElementById('appWrapper').style.display = 'none';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  hideAuthMessages();
  showToast('You have been logged out.');
}

// ==============================================================================
// 3. DATE UTILITIES & CONSTRAINTS
// ==============================================================================
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function getTomorrowString(fromDate) {
  const d = fromDate ? new Date(fromDate) : new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function calculateNights(checkIn, checkOut) {
  const diffTime = Math.abs(new Date(checkOut) - new Date(checkIn));
  return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);
}

function initDateConstraints() {
  const today = getTodayString();
  const tomorrow = getTomorrowString();

  const heroIn = document.getElementById('heroCheckIn');
  const heroOut = document.getElementById('heroCheckOut');
  const inlineIn = document.getElementById('inlineCheckIn');
  const inlineOut = document.getElementById('inlineCheckOut');

  [heroIn, inlineIn].forEach(el => {
    if (el) {
      el.min = today;
      if (!el.value) el.value = today;
    }
  });

  [heroOut, inlineOut].forEach(el => {
    if (el) {
      el.min = tomorrow;
      if (!el.value) el.value = tomorrow;
    }
  });

  // Attach auto-adjustment listeners
  if (heroIn && heroOut) {
    heroIn.addEventListener('change', () => {
      const minOut = getTomorrowString(heroIn.value);
      heroOut.min = minOut;
      if (heroOut.value <= heroIn.value) {
        heroOut.value = minOut;
      }
    });
  }

  if (inlineIn && inlineOut) {
    inlineIn.addEventListener('change', () => {
      const minOut = getTomorrowString(inlineIn.value);
      inlineOut.min = minOut;
      if (inlineOut.value <= inlineIn.value) {
        inlineOut.value = minOut;
      }
    });
  }
}

// ==============================================================================
// 4. NAVIGATION & VIEW ROUTING
// ==============================================================================
function navigate(pageId) {
  document.querySelectorAll('#appWrapper .page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.add('active');
  }

  const navLinks = document.getElementById('navLinks');
  if (navLinks) navLinks.classList.remove('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pageId === 'rooms') {
    renderRooms();
  }
}

function toggleNav() {
  const navLinks = document.getElementById('navLinks');
  if (navLinks) navLinks.classList.toggle('active');
}

// ==============================================================================
// 5. ROOM SEARCH & LIVE AVAILABILITY CALCULATION
// ==============================================================================
function getAvailableRoomCount(roomId, checkIn, checkOut) {
  // Query total units for this room
  const roomStmt = db.prepare('SELECT total FROM rooms WHERE id = ?');
  roomStmt.bind([roomId]);
  if (!roomStmt.step()) {
    roomStmt.free();
    return 0;
  }
  const total = roomStmt.getAsObject().total;
  roomStmt.free();

  if (!checkIn || !checkOut) return total;

  // Query overlapping confirmed bookings
  const bookedStmt = db.prepare(`
    SELECT COUNT(*) AS bookedCount 
    FROM bookings 
    WHERE room_id = ? 
      AND status = 'CONFIRMED'
      AND check_in < ? 
      AND check_out > ?
  `);
  bookedStmt.bind([roomId, checkOut, checkIn]);
  bookedStmt.step();
  const booked = bookedStmt.getAsObject().bookedCount;
  bookedStmt.free();

  return Math.max(total - booked, 0);
}

function searchRooms(e) {
  e.preventDefault();
  searchState.checkIn = document.getElementById('heroCheckIn').value;
  searchState.checkOut = document.getElementById('heroCheckOut').value;
  searchState.guests = parseInt(document.getElementById('heroGuests').value, 10);
  navigate('rooms');
}

function updateSearch(e) {
  e.preventDefault();
  searchState.checkIn = document.getElementById('inlineCheckIn').value;
  searchState.checkOut = document.getElementById('inlineCheckOut').value;
  searchState.guests = parseInt(document.getElementById('inlineGuests').value, 10);
  renderRooms();
}

function renderRooms() {
  // Sync inline search inputs
  const inlineIn = document.getElementById('inlineCheckIn');
  const inlineOut = document.getElementById('inlineCheckOut');
  const inlineGuests = document.getElementById('inlineGuests');

  if (inlineIn) inlineIn.value = searchState.checkIn;
  if (inlineOut) inlineOut.value = searchState.checkOut;
  if (inlineGuests) inlineGuests.value = searchState.guests;

  // Search summary text
  const summaryEl = document.getElementById('roomsSearchSummary');
  if (summaryEl) {
    if (searchState.checkIn && searchState.checkOut) {
      summaryEl.innerHTML = `<i class="fas fa-calendar-alt"></i> ${searchState.checkIn} &rarr; ${searchState.checkOut} &nbsp;|&nbsp; <i class="fas fa-user-friends"></i> ${searchState.guests} Guest${searchState.guests > 1 ? 's' : ''}`;
    } else {
      summaryEl.textContent = 'Showing all available accommodation options';
    }
  }

  // Query rooms from SQLite matching capacity
  const stmt = db.prepare('SELECT * FROM rooms WHERE capacity >= ? ORDER BY price ASC');
  stmt.bind([searchState.guests]);

  const roomList = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    row.available = getAvailableRoomCount(row.id, searchState.checkIn, searchState.checkOut);
    roomList.push(row);
  }
  stmt.free();

  const grid = document.getElementById('roomsGrid');
  if (!grid) return;

  if (roomList.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-bed"></i>
        <h2>No Rooms Match Your Criteria</h2>
        <p>Please adjust your guest count or date range to find available rooms.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = roomList.map(r => `
    <div class="room-card ${r.available <= 0 ? 'sold-out' : ''}">
      <div class="room-image">
        <img src="${r.image_url || ROOM_IMAGES[r.type]}" alt="${r.name}" loading="lazy">
        <span class="room-badge">${r.type}</span>
        ${r.available <= 2 && r.available > 0 ? `<span class="room-badge badge-warning">Only ${r.available} left!</span>` : ''}
      </div>
      <div class="room-info">
        <h3>${r.name}</h3>
        <p class="room-desc">${r.description}</p>
        <div class="room-meta">
          <span><i class="fas fa-user-friends"></i> Up to ${r.capacity} Guests</span>
          <span><i class="fas fa-door-open"></i> ${r.available} Units Available</span>
        </div>
        <div class="room-footer">
          <span class="room-price">$${r.price.toFixed(2)} <small>/night</small></span>
          ${r.available > 0
            ? `<button class="btn btn-primary btn-sm" onclick="openBooking(${r.id})"><i class="fas fa-calendar-check"></i> Book Now</button>`
            : `<span class="btn btn-disabled btn-sm"><i class="fas fa-times-circle"></i> Sold Out</span>`
          }
        </div>
      </div>
    </div>
  `).join('');
}

// ==============================================================================
// 6. BOOKING FLOW & CONFIRMATION
// ==============================================================================
function openBooking(roomId) {
  const stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
  stmt.bind([roomId]);
  if (!stmt.step()) {
    stmt.free();
    return;
  }
  const room = stmt.getAsObject();
  stmt.free();

  const checkIn = searchState.checkIn || getTodayString();
  const checkOut = searchState.checkOut || getTomorrowString(checkIn);
  const nights = calculateNights(checkIn, checkOut);
  const totalPrice = room.price * nights;

  document.getElementById('bookRoomId').value = roomId;

  // Pre-fill with current user details
  if (currentUser) {
    document.getElementById('guestName').value = currentUser.name || '';
    document.getElementById('guestEmail').value = currentUser.email || '';
    document.getElementById('guestPhone').value = currentUser.phone || '';
  }

  const summary = document.getElementById('bookingSummary');
  if (summary) {
    summary.innerHTML = `
      <h2><i class="fas fa-receipt"></i> Reservation Summary</h2>
      <div class="summary-card">
        <div class="summary-image">
          <img src="${room.image_url || ROOM_IMAGES[room.type]}" alt="${room.name}">
        </div>
        <h3>${room.name}</h3>
        <ul class="summary-details">
          <li><i class="fas fa-calendar-check"></i> <strong>Check-in:</strong> ${checkIn}</li>
          <li><i class="fas fa-calendar-times"></i> <strong>Check-out:</strong> ${checkOut}</li>
          <li><i class="fas fa-moon"></i> <strong>Duration:</strong> ${nights} Night${nights > 1 ? 's' : ''}</li>
          <li><i class="fas fa-user-friends"></i> <strong>Guests:</strong> ${searchState.guests}</li>
        </ul>
        <div class="price-breakdown">
          <div class="price-row">
            <span>$${room.price.toFixed(2)} &times; ${nights} Night${nights > 1 ? 's' : ''}</span>
            <span>$${totalPrice.toFixed(2)}</span>
          </div>
          <div class="price-row">
            <span>Taxes & Luxury Hospitality Fee</span>
            <span>Included</span>
          </div>
          <div class="price-total">
            <span>Grand Total</span>
            <span>$${totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  }

  navigate('booking');
}

function submitBooking(e) {
  e.preventDefault();
  const roomId = parseInt(document.getElementById('bookRoomId').value, 10);
  const guestName = document.getElementById('guestName').value.trim();
  const guestEmail = document.getElementById('guestEmail').value.trim();
  const guestPhone = document.getElementById('guestPhone').value.trim();

  const checkIn = searchState.checkIn || getTodayString();
  const checkOut = searchState.checkOut || getTomorrowString(checkIn);

  if (!guestName || !guestEmail || !guestPhone) {
    alert('Please fill out all required fields.');
    return;
  }

  // Check live availability in SQLite
  const available = getAvailableRoomCount(roomId, checkIn, checkOut);
  if (available <= 0) {
    alert('We apologize, but this room is no longer available for your selected dates.');
    navigate('rooms');
    return;
  }

  // Fetch room details
  const stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
  stmt.bind([roomId]);
  stmt.step();
  const room = stmt.getAsObject();
  stmt.free();

  const nights = calculateNights(checkIn, checkOut);
  const totalPrice = room.price * nights;

  // Generate unique confirmation code (Format: GH-XXXXXX)
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  const confirmationCode = `GH-${randomChars}`;

  // Insert booking into SQLite database
  const insertStmt = db.prepare(`
    INSERT INTO bookings 
    (confirmation_code, room_id, user_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total_price, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', datetime('now'))
  `);
  insertStmt.run([
    confirmationCode,
    roomId,
    currentUser ? currentUser.id : null,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    searchState.guests,
    totalPrice
  ]);
  insertStmt.free();
  saveDatabaseState();

  // Render confirmation page
  const confirmContainer = document.getElementById('confirmationContent');
  if (confirmContainer) {
    confirmContainer.innerHTML = `
      <div class="confirmation-card">
        <div class="confirmation-icon"><i class="fas fa-check-circle"></i></div>
        <h1>Reservation Confirmed!</h1>
        <p class="confirmation-subtitle">Thank you, <strong>${guestName}</strong>. Your stay at Grand Horizon has been booked.</p>

        <div class="confirmation-code-box">
          <span class="label">Official Confirmation Code</span>
          <span class="code">${confirmationCode}</span>
        </div>

        <div class="confirmation-details">
          <div class="detail-group">
            <h3><i class="fas fa-bed"></i> Room Type</h3>
            <p>${room.name}</p>
          </div>
          <div class="detail-group">
            <h3><i class="fas fa-calendar-check"></i> Check-in</h3>
            <p>${checkIn}</p>
          </div>
          <div class="detail-group">
            <h3><i class="fas fa-calendar-times"></i> Check-out</h3>
            <p>${checkOut}</p>
          </div>
          <div class="detail-group">
            <h3><i class="fas fa-moon"></i> Nights</h3>
            <p>${nights}</p>
          </div>
          <div class="detail-group">
            <h3><i class="fas fa-user-friends"></i> Guests</h3>
            <p>${searchState.guests}</p>
          </div>
          <div class="detail-group">
            <h3><i class="fas fa-dollar-sign"></i> Total Paid</h3>
            <p>$${totalPrice.toFixed(2)}</p>
          </div>
        </div>

        <div class="confirmation-contact">
          <p><i class="fas fa-envelope"></i> A booking receipt has been recorded for <strong>${guestEmail}</strong>.</p>
          <p><i class="fas fa-phone"></i> Direct Concierge Line: +1 (555) 123-4567</p>
        </div>

        <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="navigate('home')">
            <i class="fas fa-home"></i> Return to Home
          </button>
          <button class="btn btn-secondary" onclick="exportSQLiteDatabase()">
            <i class="fas fa-database"></i> Download hotel.db
          </button>
        </div>
      </div>
    `;
  }

  navigate('confirmation');
  showToast('Booking successfully confirmed & saved to SQLite database!');
}

// ==============================================================================
// 7. CONTACT FORM SUBMISSION
// ==============================================================================
function submitContact(e) {
  e.preventDefault();
  const firstName = document.getElementById('contactFirstName').value.trim();
  const lastName = document.getElementById('contactLastName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const subject = document.getElementById('contactSubject').value;
  const message = document.getElementById('contactMessage').value.trim();

  const fullName = `${firstName} ${lastName}`.trim();

  // Save inquiry into SQLite
  const stmt = db.prepare(`
    INSERT INTO contact_messages (name, email, subject, message)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run([fullName, email, subject, message]);
  stmt.free();
  saveDatabaseState();

  e.target.reset();
  showToast('Thank you! Your message has been sent to our concierge team.');
}

// ==============================================================================
// 8. TOAST NOTIFICATIONS
// ==============================================================================
function showToast(message) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fas fa-info-circle"></i> <span>${message}</span>`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ==============================================================================
// 9. STARTUP ENTRY POINT
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initDatabase();
});
