import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'database.sqlite');

let db: Database;

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function runSql(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  const safeParams = (params || []).map(p => p === undefined ? null : p);
  db.run(sql, safeParams);
  saveDb();
  
  // Get last inserted id
  const res = db.exec('SELECT last_insert_rowid() as id');
  const lastID = res.length && res[0].values.length ? Number(res[0].values[0][0]) : 0;
  
  const changesRes = db.exec('SELECT changes() as changes');
  const changes = changesRes.length && changesRes[0].values.length ? Number(changesRes[0].values[0][0]) : 0;
  
  return { lastID, changes };
}

export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const safeParams = (params || []).map(p => p === undefined ? null : p);
  const stmt = db.prepare(sql);
  if (safeParams && safeParams.length > 0) {
    stmt.bind(safeParams);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const results = await queryAll<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function initDatabase() {
  console.log('Initializing SQL database schema...');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const filebuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(filebuffer);
    } catch (e) {
      console.error('Failed to load existing db file, creating new database:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      is_admin INTEGER DEFAULT 0,
      avatar TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Categories Table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT '📦',
      parent_id INTEGER DEFAULT NULL,
      FOREIGN KEY (parent_id) REFERENCES categories (id)
    );
  `);

  // Create Listings Table
  db.run(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      daily_rate REAL NOT NULL,
      weekly_rate REAL DEFAULT NULL,
      monthly_rate REAL DEFAULT NULL,
      security_deposit REAL DEFAULT NULL,
      location TEXT NOT NULL,
      status TEXT DEFAULT 'available',
      available_from TEXT DEFAULT '2026-01-01',
      available_to TEXT DEFAULT '2026-12-31',
      rating REAL DEFAULT 5.0,
      image_url TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      address TEXT DEFAULT '',
      agreement_text TEXT DEFAULT '',
      agreement_document TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );
  `);

  const colsToEnsure = [
    { name: 'weekly_rate', spec: 'REAL DEFAULT NULL' },
    { name: 'monthly_rate', spec: 'REAL DEFAULT NULL' },
    { name: 'security_deposit', spec: 'REAL DEFAULT NULL' },
    { name: 'address', spec: "TEXT DEFAULT ''" },
    { name: 'agreement_text', spec: "TEXT DEFAULT ''" },
    { name: 'agreement_document', spec: "TEXT DEFAULT ''" },
    { name: 'available_from', spec: "TEXT DEFAULT '2026-01-01'" },
    { name: 'available_to', spec: "TEXT DEFAULT '2026-12-31'" },
    { name: 'rating', spec: "REAL DEFAULT 5.0" },
    { name: 'image_url', spec: "TEXT DEFAULT ''" },
    { name: 'images', spec: "TEXT DEFAULT '[]'" },
    { name: 'company_id', spec: "INTEGER DEFAULT NULL" },
    { name: 'lat', spec: "REAL DEFAULT NULL" },
    { name: 'lng', spec: "REAL DEFAULT NULL" },
  ];
  for (const c of colsToEnsure) {
    try { db.run(`ALTER TABLE listings ADD COLUMN ${c.name} ${c.spec}`); } catch {}
  }

  // Create Companies Table
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      logo TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      postal_code TEXT DEFAULT '',
      country TEXT DEFAULT '',
      latitude REAL DEFAULT NULL,
      longitude REAL DEFAULT NULL,
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      website TEXT DEFAULT '',
      license_number TEXT DEFAULT '',
      license_document TEXT DEFAULT '',
      certifications TEXT DEFAULT '[]',
      insurance_info TEXT DEFAULT '',
      founded_year INTEGER DEFAULT NULL,
      agreement_text TEXT DEFAULT '',
      payment_terms TEXT DEFAULT '',
      bank_account_info TEXT DEFAULT '',
      vat_number TEXT DEFAULT '',
      company_images TEXT DEFAULT '[]',
      offers TEXT DEFAULT '[]',
      social_links TEXT DEFAULT '[]',
      working_hours TEXT DEFAULT '{}',
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id)
    );
  `);

  // Create Rental Requests Table
  db.run(`
    CREATE TABLE IF NOT EXISTS rental_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      renter_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days INTEGER NOT NULL,
      total_price REAL NOT NULL,
      security_deposit REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      payment_method TEXT DEFAULT 'card',
      payment_status TEXT DEFAULT 'paid',
      card_last_four TEXT DEFAULT '4242',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings (id),
      FOREIGN KEY (renter_id) REFERENCES users (id),
      FOREIGN KEY (owner_id) REFERENCES users (id)
    );
  `);

  const reqCols = [
    { name: 'payment_method', spec: "TEXT DEFAULT 'card'" },
    { name: 'payment_status', spec: "TEXT DEFAULT 'paid'" },
    { name: 'card_last_four', spec: "TEXT DEFAULT '4242'" }
  ];
  for (const c of reqCols) {
    try { db.run(`ALTER TABLE rental_requests ADD COLUMN ${c.name} ${c.spec}`); } catch {}
  }

  // Create Messages Table
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      listing_id INTEGER DEFAULT NULL,
      rental_request_id INTEGER DEFAULT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users (id),
      FOREIGN KEY (receiver_id) REFERENCES users (id)
    );
  `);

  // Create Reviews Table
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id INTEGER NOT NULL,
      listing_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reviewer_id) REFERENCES users (id),
      FOREIGN KEY (listing_id) REFERENCES listings (id)
    );
  `);

  // Create Favorites Table
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, listing_id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (listing_id) REFERENCES listings (id)
    );
  `);

  saveDb();

  // Seed Categories if empty
  const catCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if (!catCount || catCount.count === 0) {
    console.log('Seeding categories into SQL database...');
    const defaultCategories = [
      { id: 1, name: 'Tools & Equipment', slug: 'tools-equipment', icon: '🔧', parent_id: null },
      { id: 2, name: 'Vehicles', slug: 'vehicles', icon: '🚗', parent_id: null },
      { id: 3, name: 'Space & Property', slug: 'space-property', icon: '🏠', parent_id: null },
      { id: 4, name: 'Electronics', slug: 'electronics', icon: '💻', parent_id: null },
      { id: 5, name: 'Sports & Outdoors', slug: 'sports-outdoors', icon: '⚽', parent_id: null },
      { id: 6, name: 'Party & Events', slug: 'party-events', icon: '🎉', parent_id: null },
      { id: 7, name: 'Power Tools', slug: 'power-tools', icon: '🔌', parent_id: 1 },
      { id: 8, name: 'Hand Tools', slug: 'hand-tools', icon: '🛠️', parent_id: 1 },
      { id: 9, name: 'Garden Tools', slug: 'garden-tools', icon: '🌿', parent_id: 1 },
      { id: 10, name: 'Cars', slug: 'cars', icon: '🚘', parent_id: 2 },
      { id: 11, name: 'Bikes', slug: 'bikes', icon: '🚲', parent_id: 2 },
      { id: 12, name: 'Scooters', slug: 'scooters', icon: '🛴', parent_id: 2 },
      { id: 13, name: 'Meeting Rooms', slug: 'meeting-rooms', icon: '🏢', parent_id: 3 },
      { id: 14, name: 'Event Spaces', slug: 'event-spaces', icon: '🏛️', parent_id: 3 },
      { id: 15, name: 'Parking', slug: 'parking', icon: '🅿️', parent_id: 3 },
      { id: 16, name: 'Laptops', slug: 'laptops', icon: '💻', parent_id: 4 },
      { id: 17, name: 'Cameras', slug: 'cameras', icon: '📷', parent_id: 4 },
      { id: 18, name: 'Audio', slug: 'audio', icon: '🎧', parent_id: 4 },
      { id: 19, name: 'Camping Gear', slug: 'camping-gear', icon: '🏕️', parent_id: 5 },
      { id: 20, name: 'Sports Equipment', slug: 'sports-equipment', icon: '⚾', parent_id: 5 },
      { id: 21, name: 'Kayaks & Water', slug: 'kayaks-water', icon: '🛶', parent_id: 5 },
      { id: 22, name: 'Tables & Chairs', slug: 'tables-chairs', icon: '🪑', parent_id: 6 },
      { id: 23, name: 'Tents & Canopies', slug: 'tents-canopies', icon: '⛺', parent_id: 6 },
      { id: 24, name: 'Sound Systems', slug: 'sound-systems', icon: '🔊', parent_id: 6 },
    ];

    for (const cat of defaultCategories) {
      db.run(
        'INSERT INTO categories (id, name, slug, icon, parent_id) VALUES (?, ?, ?, ?, ?)',
        [cat.id, cat.name, cat.slug, cat.icon, cat.parent_id]
      );
    }
  }

  // Seed Users if empty
  const userCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (!userCount || userCount.count === 0) {
    console.log('Seeding initial users into SQL database...');
    const passwordHash = bcrypt.hashSync('password', 10);
    const defaultUsers = [
      { id: 1, name: 'Alice Johnson', email: 'alice@example.com', password: passwordHash, phone: '555-0101', address: '123 Oak Street, Brooklyn, NY', is_admin: 1, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
      { id: 2, name: 'Bob Smith', email: 'bob@example.com', password: passwordHash, phone: '555-0102', address: '456 Maple Ave, Queens, NY', is_admin: 0, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { id: 3, name: 'Carol Davis', email: 'carol@example.com', password: passwordHash, phone: '555-0103', address: '789 Pine Road, Manhattan, NY', is_admin: 0, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
      { id: 4, name: 'Demo User', email: 'demo@example.com', password: passwordHash, phone: '555-0199', address: '100 Neighborhood Way, Brooklyn, NY', is_admin: 0, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    ];

    for (const u of defaultUsers) {
      db.run(
        'INSERT INTO users (id, name, email, password, phone, address, is_admin, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.name, u.email, u.password, u.phone, u.address, u.is_admin, u.avatar]
      );
    }
  }

  // Ensure demo@example.com user exists even if database already had other users
  const demoUser = await queryOne('SELECT * FROM users WHERE email = ?', ['demo@example.com']);
  if (!demoUser) {
    const passwordHash = bcrypt.hashSync('password', 10);
    db.run(
      'INSERT INTO users (name, email, password, phone, address, is_admin, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Demo User', 'demo@example.com', passwordHash, '555-0199', '100 Neighborhood Way, Brooklyn, NY', 0, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150']
    );
    saveDb();
  }

  // Seed Listings if empty
  const listingCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM listings');
  if (!listingCount || listingCount.count === 0) {
    console.log('Seeding initial listings into SQL database...');
    const defaultListings = [
      { id: 1, user_id: 1, category_id: 7, title: 'DeWalt Cordless Drill Kit', description: '20V drill/driver with hammer action, two batteries, charger, and 30-piece bit set. Ideal for drilling into wood, metal, and masonry.', daily_rate: 15.00, weekly_rate: 75.00, security_deposit: 50.00, location: 'Brooklyn, NY', status: 'available', image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600']) },
      { id: 2, user_id: 1, category_id: 7, title: 'Circular Saw 7-1/4"', description: 'Makita 5007MG magnesium circular saw with carbide-tipped blade. Cuts lumber, plywood, and MDF with precision.', daily_rate: 18.00, weekly_rate: 85.00, security_deposit: 60.00, location: 'Brooklyn, NY', status: 'available', image_url: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600']) },
      { id: 3, user_id: 2, category_id: 8, title: 'Mechanic Tool Set (200-pc)', description: 'Complete socket and wrench set in carrying case. SAE and metric, ratchets, screwdrivers, pliers, and hex keys.', daily_rate: 12.00, weekly_rate: 60.00, security_deposit: 40.00, location: 'Queens, NY', status: 'available', image_url: 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=600']) },
      { id: 4, user_id: 1, category_id: 9, title: 'Hedge Trimmer (Electric)', description: 'Greenworks 22" corded electric hedge trimmer with dual-action blades. Lightweight and easy to handle for shaping shrubs.', daily_rate: 14.00, weekly_rate: 65.00, security_deposit: 40.00, location: 'Brooklyn, NY', status: 'rented', image_url: 'https://images.unsplash.com/photo-1617850672203-91897fa12f36?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1617850672203-91897fa12f36?w=600']) },
      { id: 5, user_id: 2, category_id: 10, title: 'Honda Civic 2022', description: 'Reliable sedan, great on gas. Automatic, Bluetooth, backup camera. Available for weekend trips or daily commutes.', daily_rate: 45.00, weekly_rate: 250.00, monthly_rate: 800.00, security_deposit: 200.00, location: 'Queens, NY', status: 'available', image_url: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600']) },
      { id: 6, user_id: 3, category_id: 11, title: 'Electric Commuter Bike', description: 'Trek FX+ 7S e-bike with 50-mile range and pedal assist. Includes helmet lock and rear rack. Perfect for city riding.', daily_rate: 22.00, weekly_rate: 110.00, security_deposit: 150.00, location: 'Manhattan, NY', status: 'available', image_url: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=600']) },
      { id: 7, user_id: 3, category_id: 13, title: 'Bright Conference Room (8 ppl)', description: 'Sunlit meeting room with 8-person table, 65" 4K display, video conferencing camera, whiteboard, and high-speed WiFi.', daily_rate: 50.00, weekly_rate: 200.00, monthly_rate: 600.00, location: 'Manhattan, NY', status: 'available', image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1497366216548-37526070297c?w=600']) },
      { id: 8, user_id: 2, category_id: 16, title: 'MacBook Pro 14" M3 Pro', description: 'Apple MacBook Pro with M3 Pro chip, 18GB RAM, 512GB SSD. Lightly used, excellent condition, charger included.', daily_rate: 40.00, weekly_rate: 220.00, security_deposit: 500.00, location: 'Queens, NY', status: 'available', image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600']) },
      { id: 9, user_id: 1, category_id: 17, title: 'Canon EOS R6 + 24-105mm', description: 'Full-frame mirrorless camera with RF 24-105mm f/4L kit lens. 4K video, IBIS, dual card slots. Extra battery included.', daily_rate: 50.00, weekly_rate: 280.00, security_deposit: 400.00, location: 'Brooklyn, NY', status: 'available', image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600']) },
      { id: 10, user_id: 3, category_id: 19, title: '4-Person Camping Tent', description: 'REI Co-op Grand Hut 4 with rainfly and footprint. Easy 2-minute setup, excellent weather protection for family camping trips.', daily_rate: 22.00, weekly_rate: 100.00, security_deposit: 80.00, location: 'Brooklyn, NY', status: 'available', image_url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600', images: JSON.stringify(['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600']) }
    ];

    for (const l of defaultListings) {
      db.run(
        `INSERT INTO listings (id, user_id, category_id, title, description, daily_rate, weekly_rate, monthly_rate, security_deposit, location, status, image_url, images)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [l.id, l.user_id, l.category_id, l.title, l.description, l.daily_rate, l.weekly_rate || null, l.monthly_rate || null, l.security_deposit || null, l.location, l.status, l.image_url, l.images]
      );
    }
  }

  // Seed Reviews if empty
  const reviewCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM reviews');
  if (!reviewCount || reviewCount.count === 0) {
    const seedRevs = [
      { id: 1, reviewer_id: 2, listing_id: 1, rating: 5, comment: 'Great drill! Worked perfectly for mounting my shelving unit. Very polite owner.' },
      { id: 2, reviewer_id: 3, listing_id: 1, rating: 5, comment: 'Batteries were fully charged and extra bit set was super helpful. Highly recommend!' },
      { id: 3, reviewer_id: 1, listing_id: 3, rating: 4, comment: 'Solid tool set. All socket sizes were included and clean.' },
      { id: 4, reviewer_id: 2, listing_id: 6, rating: 5, comment: 'E-bike was smooth and fast! Made riding across town a breeze.' },
      { id: 5, reviewer_id: 1, listing_id: 5, rating: 5, comment: 'Clean car, super easy pickup and drop-off in Queens!' },
      { id: 6, reviewer_id: 3, listing_id: 9, rating: 5, comment: 'Amazing camera kit for weekend photoshoot. Extra battery saved the day!' },
    ];
    for (const rev of seedRevs) {
      db.run(
        'INSERT INTO reviews (id, reviewer_id, listing_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
        [rev.id, rev.reviewer_id, rev.listing_id, rev.rating, rev.comment]
      );
    }
  }

  // Seed Rental Requests if empty
  const rentalReqCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM rental_requests');
  if (!rentalReqCount || rentalReqCount.count === 0) {
    const seedRentals = [
      { id: 1, listing_id: 6, renter_id: 1, owner_id: 3, start_date: '2026-08-07', end_date: '2026-08-10', total_days: 3, total_price: 66, security_deposit: 150, status: 'accepted' },
      { id: 2, listing_id: 3, renter_id: 1, owner_id: 2, start_date: '2026-08-15', end_date: '2026-08-18', total_days: 3, total_price: 36, security_deposit: 40, status: 'accepted' },
      { id: 3, listing_id: 5, renter_id: 1, owner_id: 2, start_date: '2026-07-10', end_date: '2026-07-14', total_days: 4, total_price: 180, security_deposit: 200, status: 'completed' },
      { id: 4, listing_id: 9, renter_id: 1, owner_id: 3, start_date: '2026-08-20', end_date: '2026-08-23', total_days: 3, total_price: 150, security_deposit: 400, status: 'pending' },
      { id: 5, listing_id: 1, renter_id: 2, owner_id: 1, start_date: '2026-08-12', end_date: '2026-08-14', total_days: 2, total_price: 30, security_deposit: 50, status: 'accepted' },
    ];
    for (const r of seedRentals) {
      db.run(
        `INSERT INTO rental_requests (id, listing_id, renter_id, owner_id, start_date, end_date, total_days, total_price, security_deposit, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.listing_id, r.renter_id, r.owner_id, r.start_date, r.end_date, r.total_days, r.total_price, r.security_deposit, r.status]
      );
    }
  }

  // Seed Companies if empty
  const companyCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM companies');
  if (!companyCount || companyCount.count === 0) {
    console.log('Seeding initial companies into SQL database...');
    const seedCompanies = [
      {
        id: 1,
        owner_id: 1,
        name: 'Apex Commercial Equipment & Rentals',
        slug: 'apex-commercial-equipment-rentals',
        description: 'Premier commercial and residential power tools, heavy machinery, and precision camera gear rental company in New York & Toronto.',
        address: '100 Industrial Parkway, Suite 400',
        city: 'Brooklyn',
        state: 'NY',
        postal_code: '11201',
        country: 'USA',
        phone: '(555) 019-8822',
        email: 'contact@apexrentals.com',
        website: 'https://apexrentals.com',
        license_number: 'LIC-NY-883921-B',
        certifications: JSON.stringify(['ISO-9001 Certified Quality', 'Safety First Verified', 'Licensed Heavy Operator']),
        insurance_info: 'Full $2,000,000 Commercial Liability & All-Risk Equipment Insurance Coverage included.',
        founded_year: 2018,
        agreement_text: `MASTER COMMERCIAL RENTAL AGREEMENT & COMPLIANCE TERMS:
1. Equipment Condition & Inspection: All items are inspected and sanitized prior to handover. Renter agrees to operate equipment strictly according to manufacturer specifications.
2. Security Deposit & Returns: The standard security deposit is held as a pre-authorization and fully released upon return in clean, operational condition.
3. Overdue Fees: Equipment returned past the scheduled end window will incur a half-day rate charge for every 12 hours overdue unless prior extension approval is granted.
4. Damage & Loss Policy: Accidental loss or damage beyond normal operational wear is covered under our Commercial Equipment Liability Plan up to $10,000 per rental agreement.`,
        payment_terms: 'Direct Escrow, Major Credit Cards (Visa/MC/Amex), ACH Bank Transfer.',
        vat_number: 'US-EIN-982104921',
        offers: JSON.stringify(['10% Off First-Time Business Rentals', 'Free Weekend Pickup / Drop-off', 'Insurance Coverage Included']),
        social_links: JSON.stringify([{ platform: 'LinkedIn', url: 'https://linkedin.com' }, { platform: 'Instagram', url: 'https://instagram.com' }]),
        working_hours: JSON.stringify({
          Monday: { open: '08:00', close: '18:00', closed: false },
          Tuesday: { open: '08:00', close: '18:00', closed: false },
          Wednesday: { open: '08:00', close: '18:00', closed: false },
          Thursday: { open: '08:00', close: '18:00', closed: false },
          Friday: { open: '08:00', close: '18:00', closed: false },
          Saturday: { open: '09:00', close: '16:00', closed: false },
          Sunday: { open: '10:00', close: '14:00', closed: true }
        }),
        is_verified: 1
      },
      {
        id: 2,
        owner_id: 2,
        name: 'Metro Outdoor & Mobility Logistics',
        slug: 'metro-outdoor-mobility-logistics',
        description: 'Community provider for high-performance commuter e-bikes, camping tents, event setups, and passenger vehicles.',
        address: '450 Lakeshore Blvd West',
        city: 'Queens',
        state: 'NY',
        postal_code: '11101',
        country: 'USA',
        phone: '(555) 024-9911',
        email: 'rentals@metrooutdoors.com',
        website: 'https://metrooutdoors.com',
        license_number: 'LIC-NY-992011-C',
        certifications: JSON.stringify(['Eco-Mobility Certified', 'Guided Outdoor Safety Alliance']),
        insurance_info: 'Comprehensive Vehicle & Outdoor Equipment Insurance Protection.',
        founded_year: 2021,
        agreement_text: `OUTDOOR & VEHICLE RENTAL AGREEMENT:
1. Driver / Operator Requirements: Drivers must hold a valid driver's license. E-bike operators must wear helmets at all times.
2. Clean Return Guarantee: Tents, watercraft, and vehicles must be returned cleaned and dry.
3. Security Deposit: Refundable deposit processed within 24 hours of item return inspection.`,
        payment_terms: 'Credit Card pre-authorization hold required at pickup.',
        vat_number: 'US-EIN-123984722',
        offers: JSON.stringify(['Free Helmet & Lock with E-Bike Rentals', 'Multi-Day Camping Discount']),
        social_links: JSON.stringify([{ platform: 'Facebook', url: 'https://facebook.com' }, { platform: 'Instagram', url: 'https://instagram.com' }]),
        working_hours: JSON.stringify({
          Monday: { open: '09:00', close: '19:00', closed: false },
          Tuesday: { open: '09:00', close: '19:00', closed: false },
          Wednesday: { open: '09:00', close: '19:00', closed: false },
          Thursday: { open: '09:00', close: '19:00', closed: false },
          Friday: { open: '09:00', close: '20:00', closed: false },
          Saturday: { open: '08:00', close: '18:00', closed: false },
          Sunday: { open: '09:00', close: '17:00', closed: false }
        }),
        is_verified: 1
      }
    ];

    for (const c of seedCompanies) {
      db.run(
        `INSERT INTO companies (id, owner_id, name, slug, description, address, city, state, postal_code, country, phone, email, website, license_number, certifications, insurance_info, founded_year, agreement_text, payment_terms, vat_number, offers, social_links, working_hours, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.owner_id, c.name, c.slug, c.description, c.address, c.city, c.state, c.postal_code, c.country, c.phone, c.email, c.website, c.license_number, c.certifications, c.insurance_info, c.founded_year, c.agreement_text, c.payment_terms, c.vat_number, c.offers, c.social_links, c.working_hours, c.is_verified]
      );
    }

    // Attach sample listings to seed companies
    db.run('UPDATE listings SET company_id = 1 WHERE id IN (1, 2, 9)');
    db.run('UPDATE listings SET company_id = 2 WHERE id IN (5, 6, 10)');
  }

  saveDb();
  console.log('SQL database initialized successfully!');
}
