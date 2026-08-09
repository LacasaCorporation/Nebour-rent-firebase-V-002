import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase, queryAll, queryOne, runSql } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'neighbour-renting-secret-key-2026';

// Setup file upload
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const upload = multer({ dest: uploadsDir });

const unavailableDatesMap: Record<number, string[]> = {};
const notificationPreferencesMap: Record<number, any> = {};
const notificationsList: any[] = [];
const savedSearchesList: any[] = [];

// Helper function to format database listing row into nested object format
function formatListing(row: any) {
  if (!row) return null;
  let parsedImages: string[] = [];
  try {
    parsedImages = typeof row.images === 'string' ? JSON.parse(row.images) : row.images || [];
  } catch {
    parsedImages = [row.image_url || 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=600'];
  }
  if (!parsedImages.length && row.image_url) {
    parsedImages = [row.image_url];
  }

  const effectiveAgreementText = row.agreement_text || row.company_agreement_text || '';

  return {
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id,
    company_id: row.company_id || null,
    title: row.title,
    name: row.title,
    description: row.description,
    daily_rate: Number(row.daily_rate),
    price: Number(row.daily_rate),
    weekly_rate: row.weekly_rate ? Number(row.weekly_rate) : null,
    monthly_rate: row.monthly_rate ? Number(row.monthly_rate) : null,
    security_deposit: row.security_deposit ? Number(row.security_deposit) : null,
    location: row.location,
    address: row.address || '',
    lat: row.lat !== null && row.lat !== undefined ? Number(row.lat) : null,
    lng: row.lng !== null && row.lng !== undefined ? Number(row.lng) : null,
    status: row.status,
    available_from: row.available_from,
    available_to: row.available_to,
    agreement_text: effectiveAgreementText,
    agreement_document: row.agreement_document || '',
    rating: Number(row.rating || 5.0),
    image_url: row.image_url || 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=600',
    image: row.image_url || 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=600',
    images: parsedImages.length > 0 ? parsedImages : [row.image_url || 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=600'],
    created_at: row.created_at,
    user: row.user_name ? {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      phone: row.user_phone,
      avatar: row.user_avatar
    } : undefined,
    category: row.category_name ? {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
      icon: row.category_icon
    } : undefined,
    company: row.company_name ? {
      id: row.company_id,
      name: row.company_name,
      slug: row.company_slug,
      logo: row.company_logo,
      cover_image: row.company_cover_image,
      is_verified: !!row.company_is_verified,
      agreement_text: row.company_agreement_text || '',
      license_number: row.company_license_number || '',
      insurance_info: row.company_insurance_info || '',
      phone: row.company_phone || '',
      email: row.company_email || '',
      website: row.company_website || '',
      address: row.company_address || ''
    } : undefined,
    reviews: []
  };
}

function parseNum(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseListingData(req: any) {
  const body = req.body || {};
  const title = String(body.title || body.name || '').trim();
  const description = String(body.description || '').trim();
  const daily_rate = parseNum(body.daily_rate || body.price || body.rate) ?? 0;
  const weekly_rate = parseNum(body.weekly_rate);
  const monthly_rate = parseNum(body.monthly_rate);
  const security_deposit = parseNum(body.security_deposit);
  const category_id = parseNum(body.category_id) || 1;
  const company_id = parseNum(body.company_id);
  const location = String(body.location || body.address || req.user?.address || 'Local area').trim();
  const address = String(body.address || '').trim();
  const lat = parseNum(body.lat);
  const lng = parseNum(body.lng);
  const status = String(body.status || 'available').trim();
  const available_from = String(body.available_from || '2026-01-01').trim();
  const available_to = String(body.available_to || '2026-12-31').trim();
  const agreement_text = String(body.agreement_text || '').trim();

  let imagesList: string[] = [];
  const bodyImages = body['images[]'] || body.images || body.image_url || body.image;
  if (Array.isArray(bodyImages)) {
    imagesList.push(...bodyImages.map((x: any) => String(x)));
  } else if (typeof bodyImages === 'string' && bodyImages.trim()) {
    try {
      const parsed = JSON.parse(bodyImages);
      if (Array.isArray(parsed)) {
        imagesList.push(...parsed.map((x: any) => String(x)));
      } else {
        imagesList.push(bodyImages);
      }
    } catch {
      imagesList.push(bodyImages);
    }
  }

  if (req.files && Array.isArray(req.files)) {
    for (const f of req.files) {
      if (f.fieldname === 'agreement_document') continue;
      imagesList.push(`/uploads/${f.filename}`);
    }
  }

  imagesList = imagesList.filter((x: any) => typeof x === 'string' && x.trim());
  const mainImage = imagesList[0] || 'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?w=600';
  if (imagesList.length === 0) imagesList = [mainImage];

  let agreement_document = '';
  if (req.files && Array.isArray(req.files)) {
    const docFile = req.files.find((f: any) => f.fieldname === 'agreement_document');
    if (docFile) {
      agreement_document = `/uploads/${docFile.filename}`;
    }
  }

  return {
    title,
    description,
    daily_rate,
    weekly_rate,
    monthly_rate,
    security_deposit,
    category_id,
    company_id,
    location,
    address,
    lat,
    lng,
    status,
    available_from,
    available_to,
    agreement_text,
    agreement_document,
    mainImage,
    imagesJson: JSON.stringify(imagesList)
  };
}

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'company';
}

function safeJsonParse(str: any, defaultVal: any) {
  if (!str) return defaultVal;
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch {
    return defaultVal;
  }
}

const SELECT_LISTING_FIELDS = `
  l.*, 
  u.name as user_name, u.email as user_email, u.phone as user_phone, u.avatar as user_avatar,
  c.name as category_name, c.slug as category_slug, c.icon as category_icon,
  comp.name as company_name, comp.slug as company_slug, comp.logo as company_logo, comp.cover_image as company_cover_image, comp.is_verified as company_is_verified, comp.agreement_text as company_agreement_text, comp.license_number as company_license_number, comp.insurance_info as company_insurance_info, comp.phone as company_phone, comp.email as company_email, comp.website as company_website, comp.address as company_address
`;

async function getCompanyFullDetail(slugOrId: string | number) {
  let cRow;
  if (typeof slugOrId === 'number' || (!isNaN(Number(slugOrId)) && !String(slugOrId).includes('-'))) {
    cRow = await queryOne('SELECT c.*, u.name as owner_name, u.email as owner_email, u.avatar as owner_avatar FROM companies c LEFT JOIN users u ON c.owner_id = u.id WHERE c.id = ?', [Number(slugOrId)]);
  } else {
    cRow = await queryOne('SELECT c.*, u.name as owner_name, u.email as owner_email, u.avatar as owner_avatar FROM companies c LEFT JOIN users u ON c.owner_id = u.id WHERE c.slug = ?', [slugOrId]);
  }
  if (!cRow) return null;

  const listingsRows = await queryAll(`
    SELECT ${SELECT_LISTING_FIELDS}
    FROM listings l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN companies comp ON l.company_id = comp.id
    WHERE l.company_id = ?
    ORDER BY l.id DESC
  `, [cRow.id]);

  const listings = listingsRows.map(formatListing);

  const totalListings = listings.length;
  const availableListings = listings.filter((l: any) => l.status === 'available').length;
  
  const rentalsCount = await queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM rental_requests r
    JOIN listings l ON r.listing_id = l.id
    WHERE l.company_id = ?
  `, [cRow.id]);

  const avgRatingRes = await queryOne<{ avg_rating: number }>(`
    SELECT AVG(rev.rating) as avg_rating FROM reviews rev
    JOIN listings l ON rev.listing_id = l.id
    WHERE l.company_id = ?
  `, [cRow.id]);

  const parsedCerts = safeJsonParse(cRow.certifications, []);
  const parsedImages = safeJsonParse(cRow.company_images, []);
  const parsedOffers = safeJsonParse(cRow.offers, []);
  const parsedSocial = safeJsonParse(cRow.social_links, []);
  const parsedHours = safeJsonParse(cRow.working_hours, {});

  const teamMembers = await queryAll(`
    SELECT id, name, email, avatar FROM users WHERE id = ?
  `, [cRow.owner_id]);

  return {
    id: cRow.id,
    owner_id: cRow.owner_id,
    name: cRow.name,
    slug: cRow.slug,
    description: cRow.description || '',
    logo: cRow.logo || '',
    cover_image: cRow.cover_image || '',
    address: cRow.address || '',
    city: cRow.city || '',
    state: cRow.state || '',
    postal_code: cRow.postal_code || '',
    country: cRow.country || '',
    latitude: cRow.latitude,
    longitude: cRow.longitude,
    phone: cRow.phone || '',
    email: cRow.email || '',
    website: cRow.website || '',
    license_number: cRow.license_number || '',
    license_document: cRow.license_document || '',
    certifications: parsedCerts,
    insurance_info: cRow.insurance_info || '',
    founded_year: cRow.founded_year,
    agreement_text: cRow.agreement_text || '',
    payment_terms: cRow.payment_terms || '',
    bank_account_info: cRow.bank_account_info || '',
    vat_number: cRow.vat_number || '',
    company_images: parsedImages,
    offers: parsedOffers,
    social_links: parsedSocial,
    working_hours: parsedHours,
    is_verified: !!cRow.is_verified,
    created_at: cRow.created_at,
    listings_count: totalListings,
    total_listings: totalListings,
    available_listings: availableListings,
    total_rentals: rentalsCount?.count || 0,
    avg_rating: avgRatingRes?.avg_rating != null ? Number(avgRatingRes.avg_rating).toFixed(1) : null,
    owner: {
      id: cRow.owner_id,
      name: cRow.owner_name,
      email: cRow.owner_email,
      avatar: cRow.owner_avatar
    },
    users: teamMembers,
    listings
  };
}

// Express App
async function startServer() {
  // Initialize SQL Database Tables and Default Seeds
  await initDatabase();

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Auth Middleware
  const authenticateToken = async (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication token required' });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await queryOne('SELECT id, name, email, password, phone, address, is_admin, avatar FROM users WHERE id = ?', [decoded.id]);
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  const optionalAuth = async (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = await queryOne('SELECT id, name, email, password, phone, address, is_admin, avatar FROM users WHERE id = ?', [decoded.id]);
      } catch {}
    }
    next();
  };

  // ------------------ API ROUTES ------------------

  // AUTH
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      const { name, email, password, phone, address } = req.body;
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedName = (name || '').trim();

      if (!normalizedEmail || !password || !normalizedName) {
        return res.status(422).json({ error: 'Name, email, and password are required.' });
      }

      const existing = await queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
      if (existing) {
        return res.status(422).json({ error: 'This email address is already registered.' });
      }

      const hash = bcrypt.hashSync(password, 10);
      const avatar = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`;

      const { lastID } = await runSql(
        'INSERT INTO users (name, email, password, phone, address, is_admin, avatar) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [normalizedName, normalizedEmail, hash, phone || '', address || '', avatar]
      );

      const newUser = await queryOne('SELECT id, name, email, phone, address, is_admin, avatar FROM users WHERE id = ?', [lastID]);
      const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '30d' });

      res.json({ token, user: newUser });
    } catch (err: any) {
      console.error('Registration server error:', err);
      res.status(500).json({ error: err.message || 'Server error during registration' });
    }
  });

  app.post('/api/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...userWithoutPw } = user;
    res.json({ token, user: userWithoutPw });
  });

  app.post('/api/logout', (req: Request, res: Response) => {
    res.json({ message: 'Logged out successfully' });
  });

  app.get('/api/user', authenticateToken, (req: any, res: Response) => {
    const { password: _, ...userWithoutPw } = req.user;
    res.json(userWithoutPw);
  });

  app.put('/api/user', authenticateToken, upload.single('avatar'), async (req: any, res: Response) => {
    const userId = req.user.id;
    const { name, phone, address } = req.body;
    let avatarUrl = req.user.avatar;

    if (req.file) {
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    await runSql(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address), avatar = COALESCE(?, avatar) WHERE id = ?',
      [name || null, phone || null, address || null, avatarUrl || null, userId]
    );

    const updatedUser = await queryOne('SELECT id, name, email, phone, address, is_admin, avatar FROM users WHERE id = ?', [userId]);
    res.json(updatedUser);
  });

  app.put('/api/user/password', authenticateToken, async (req: any, res: Response) => {
    const { current_password, new_password } = req.body;
    if (!bcrypt.compareSync(current_password, req.user.password)) {
      return res.status(422).json({ error: 'Current password does not match' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    await runSql('UPDATE users SET password = ? WHERE id = ?', [newHash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  });

  // STATS
  app.get('/api/stats', async (req: Request, res: Response) => {
    const totalListings = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM listings');
    const availListings = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM listings WHERE status = "available"');
    const totalUsers = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const totalCategories = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM categories');
    const totalRentals = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM rental_requests WHERE status = "accepted"');
    const totalReviews = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM reviews');

    res.json({
      total_listings: totalListings?.count || 0,
      available_listings: availListings?.count || 0,
      total_users: totalUsers?.count || 0,
      total_categories: totalCategories?.count || 0,
      total_rentals: totalRentals?.count || 0,
      total_reviews: totalReviews?.count || 0,
      avg_rating: 4.8
    });
  });

  // CATEGORIES
  app.get('/api/categories', async (req: Request, res: Response) => {
    const categories = await queryAll('SELECT * FROM categories ORDER BY id ASC');
    res.json({ data: categories });
  });

  app.get('/api/categories/:slug', async (req: Request, res: Response) => {
    const cat = await queryOne('SELECT * FROM categories WHERE slug = ?', [req.params.slug]);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    res.json(cat);
  });

  // LISTINGS
  app.get('/api/listings', optionalAuth, async (req: Request, res: Response) => {
    const { search, category_id, company_id, location, min_price, max_price, sort, direction } = req.query;

    let sql = `
      SELECT ${SELECT_LISTING_FIELDS}
      FROM listings l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN companies comp ON l.company_id = comp.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (LOWER(l.title) LIKE ? OR LOWER(l.description) LIKE ?)`;
      const q = `%${String(search).toLowerCase()}%`;
      params.push(q, q);
    }

    if (category_id) {
      const catId = Number(category_id);
      const childCategories = await queryAll<{ id: number }>('SELECT id FROM categories WHERE parent_id = ?', [catId]);
      const validIds = [catId, ...childCategories.map(c => c.id)];
      sql += ` AND l.category_id IN (${validIds.map(() => '?').join(',')})`;
      params.push(...validIds);
    }

    if (company_id) {
      sql += ` AND l.company_id = ?`;
      params.push(Number(company_id));
    }

    if (location) {
      sql += ` AND LOWER(l.location) LIKE ?`;
      params.push(`%${String(location).toLowerCase()}%`);
    }

    if (min_price) {
      sql += ` AND l.daily_rate >= ?`;
      params.push(Number(min_price));
    }

    if (max_price) {
      sql += ` AND l.daily_rate <= ?`;
      params.push(Number(max_price));
    }

    if (sort === 'daily_rate') {
      const dir = direction === 'asc' ? 'ASC' : 'DESC';
      sql += ` ORDER BY l.daily_rate ${dir}`;
    } else if (sort === 'rating') {
      sql += ` ORDER BY l.rating DESC`;
    } else {
      sql += ` ORDER BY l.id DESC`;
    }

    const rows = await queryAll(sql, params);
    const formatted = rows.map(formatListing);

    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.per_page) || Number(req.query.limit) || 12;
    const total = formatted.length;
    const start = (page - 1) * perPage;
    const paginated = formatted.slice(start, start + perPage);

    res.json({
      data: paginated,
      current_page: page,
      last_page: Math.ceil(total / perPage) || 1,
      total
    });
  });

  app.post('/api/listings/upload-images', authenticateToken, upload.any(), (req: any, res: Response) => {
    const files = (req.files || []) as Express.Multer.File[];
    const urls = files.map(f => `/uploads/${f.filename}`);
    res.json({ urls, paths: urls });
  });

  app.get('/api/my-listings', authenticateToken, async (req: any, res: Response) => {
    const rows = await queryAll(`
      SELECT ${SELECT_LISTING_FIELDS}
      FROM listings l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN companies comp ON l.company_id = comp.id
      WHERE l.user_id = ?
      ORDER BY l.id DESC
    `, [req.user.id]);

    const formatted = rows.map(formatListing);
    res.json({ data: formatted });
  });

  app.get('/api/listings/:id', async (req: Request, res: Response) => {
    const row = await queryOne(`
      SELECT ${SELECT_LISTING_FIELDS}
      FROM listings l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN companies comp ON l.company_id = comp.id
      WHERE l.id = ?
    `, [req.params.id]);

    if (!row) return res.status(404).json({ error: 'Listing not found' });

    const formatted = formatListing(row);
    // Fetch associated reviews from database
    const reviews = await queryAll(`
      SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.listing_id = ?
      ORDER BY r.id DESC
    `, [req.params.id]);

    const verifiedRenters = await queryAll(`
      SELECT DISTINCT renter_id FROM rental_requests WHERE listing_id = ? AND status = 'completed'
    `, [req.params.id]);
    const verifiedRenterIds = new Set(verifiedRenters.map((vr: any) => vr.renter_id));

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScore = 0;

    formatted.reviews = reviews.map(r => {
      const rNum = Math.min(5, Math.max(1, Math.round(Number(r.rating))));
      breakdown[rNum] = (breakdown[rNum] || 0) + 1;
      totalScore += Number(r.rating);
      return {
        id: r.id,
        rating: Number(r.rating),
        comment: r.comment,
        created_at: r.created_at,
        is_verified_rental: verifiedRenterIds.has(r.reviewer_id),
        reviewer: { id: r.reviewer_id, name: r.reviewer_name, avatar: r.reviewer_avatar }
      };
    });

    formatted.rating_count = reviews.length;
    formatted.rating_breakdown = breakdown;
    if (reviews.length > 0) {
      formatted.rating = Number((totalScore / reviews.length).toFixed(1));
    }

    res.json(formatted);
  });

  // Price comparison for a single listing vs neighborhood / category
  app.get('/api/listings/:id/price-comparison', async (req: Request, res: Response) => {
    try {
      const targetId = Number(req.params.id);
      const targetRow = await queryOne(`
        SELECT ${SELECT_LISTING_FIELDS}
        FROM listings l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN companies comp ON l.company_id = comp.id
        WHERE l.id = ?
      `, [targetId]);

      if (!targetRow) return res.status(404).json({ error: 'Listing not found' });
      const target = formatListing(targetRow);

      // Fetch all active listings in the same category or overall to compute benchmarks
      const categoryRows = await queryAll(`
        SELECT ${SELECT_LISTING_FIELDS}
        FROM listings l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN companies comp ON l.company_id = comp.id
        WHERE l.category_id = ? OR l.category_id IS NULL
      `, [target.category_id || 1]);

      const formattedCategoryListings = categoryRows.map(formatListing);
      const categoryCount = formattedCategoryListings.length;

      // Calculate category metrics
      const dailyRates = formattedCategoryListings.map((l: any) => Number(l.daily_rate) || 0).filter(r => r > 0);
      const weeklyRates = formattedCategoryListings.map((l: any) => Number(l.weekly_rate) || 0).filter(r => r > 0);
      const deposits = formattedCategoryListings.map((l: any) => Number(l.security_deposit) || 0).filter(d => d >= 0);

      const categoryAvgDaily = dailyRates.length ? Number((dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length).toFixed(2)) : Number(target.daily_rate);
      const categoryMinDaily = dailyRates.length ? Math.min(...dailyRates) : Number(target.daily_rate);
      const categoryMaxDaily = dailyRates.length ? Math.max(...dailyRates) : Number(target.daily_rate);
      
      const categoryAvgWeekly = weeklyRates.length ? Number((weeklyRates.reduce((a, b) => a + b, 0) / weeklyRates.length).toFixed(2)) : Number(target.weekly_rate || 0);
      const categoryAvgDeposit = deposits.length ? Number((deposits.reduce((a, b) => a + b, 0) / deposits.length).toFixed(2)) : Number(target.security_deposit || 0);

      // Neighborhood match (city or matching location string)
      const locationKey = (target.location || '').split(',')[0].trim().toLowerCase();
      const neighborhoodListings = formattedCategoryListings.filter((l: any) => {
        const loc = (l.location || '').toLowerCase();
        return locationKey && loc.includes(locationKey);
      });

      const neighborhoodDailyRates = (neighborhoodListings.length > 0 ? neighborhoodListings : formattedCategoryListings)
        .map((l: any) => Number(l.daily_rate) || 0)
        .filter(r => r > 0);

      const neighborhoodAvgDaily = neighborhoodDailyRates.length
        ? Number((neighborhoodDailyRates.reduce((a, b) => a + b, 0) / neighborhoodDailyRates.length).toFixed(2))
        : categoryAvgDaily;

      // Price difference calculation
      const targetDaily = Number(target.daily_rate) || 0;
      const diffVsCategoryAvg = categoryAvgDaily > 0 ? Number((((targetDaily - categoryAvgDaily) / categoryAvgDaily) * 100).toFixed(1)) : 0;
      const diffVsNeighborhoodAvg = neighborhoodAvgDaily > 0 ? Number((((targetDaily - neighborhoodAvgDaily) / neighborhoodAvgDaily) * 100).toFixed(1)) : 0;

      let dealBadge = 'Market Rate';
      let dealBadgeColor = 'blue'; // blue, emerald, teal, purple
      let dealDescription = 'Priced aligned with local neighborhood market rate.';

      if (diffVsNeighborhoodAvg <= -15) {
        dealBadge = 'Great Deal';
        dealBadgeColor = 'emerald';
        dealDescription = `${Math.abs(diffVsNeighborhoodAvg)}% below average rate in ${target.location || 'your area'}`;
      } else if (diffVsNeighborhoodAvg < 0) {
        dealBadge = 'Good Value';
        dealBadgeColor = 'teal';
        dealDescription = `${Math.abs(diffVsNeighborhoodAvg)}% lower than local average`;
      } else if (diffVsNeighborhoodAvg > 20) {
        dealBadge = 'Premium Equipment';
        dealBadgeColor = 'purple';
        dealDescription = 'Higher-end rate reflecting premium specs, company verification, or extra services';
      }

      // Filter 3-5 similar items in the same category or area (excluding current item)
      const similarItems = formattedCategoryListings
        .filter((l: any) => Number(l.id) !== targetId)
        .slice(0, 5)
        .map((l: any) => {
          const lDaily = Number(l.daily_rate) || 0;
          const diffDaily = Number((lDaily - targetDaily).toFixed(2));
          return {
            id: l.id,
            title: l.title,
            image_url: l.image_url,
            daily_rate: l.daily_rate,
            weekly_rate: l.weekly_rate,
            security_deposit: l.security_deposit,
            location: l.location,
            rating: l.rating,
            rating_count: l.rating_count,
            company: l.company ? { name: l.company.name, is_verified: l.company.is_verified } : null,
            owner_name: l.company?.name || l.owner_name || l.user_name || 'Owner',
            price_diff_vs_target: diffDaily,
            price_diff_percent: targetDaily > 0 ? Number((((lDaily - targetDaily) / targetDaily) * 100).toFixed(1)) : 0
          };
        });

      res.json({
        target: {
          id: target.id,
          title: target.title,
          daily_rate: target.daily_rate,
          weekly_rate: target.weekly_rate,
          monthly_rate: target.monthly_rate,
          security_deposit: target.security_deposit,
          location: target.location,
          category: target.category?.name || 'General'
        },
        benchmarks: {
          category_name: target.category?.name || 'General',
          total_listings_in_category: categoryCount,
          category_avg_daily: categoryAvgDaily,
          category_min_daily: categoryMinDaily,
          category_max_daily: categoryMaxDaily,
          category_avg_weekly: categoryAvgWeekly,
          category_avg_deposit: categoryAvgDeposit,
          neighborhood_avg_daily: neighborhoodAvgDaily,
          neighborhood_sample_size: neighborhoodListings.length || categoryCount
        },
        analysis: {
          diff_vs_category_avg_percent: diffVsCategoryAvg,
          diff_vs_neighborhood_avg_percent: diffVsNeighborhoodAvg,
          deal_badge: dealBadge,
          deal_badge_color: dealBadgeColor,
          deal_description: dealDescription,
          estimated_3day_savings: categoryAvgDaily > targetDaily ? Number(((categoryAvgDaily - targetDaily) * 3).toFixed(2)) : 0,
          estimated_weekly_savings: categoryAvgWeekly > Number(target.weekly_rate) ? Number((categoryAvgWeekly - Number(target.weekly_rate)).toFixed(2)) : 0
        },
        similar_items: similarItems
      });
    } catch (err: any) {
      console.error('Error computing price comparison:', err);
      res.status(500).json({ error: 'Failed to compute price comparison' });
    }
  });

  // Batch side-by-side comparison endpoint for multiple listings (e.g. ?ids=1,2,3)
  app.get('/api/listings-compare', async (req: Request, res: Response) => {
    try {
      const idsParam = String(req.query.ids || '');
      const ids = idsParam.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id) && id > 0);

      if (!ids.length) {
        return res.status(400).json({ error: 'No valid listing IDs provided' });
      }

      const placeholders = ids.map(() => '?').join(',');
      const rows = await queryAll(`
        SELECT ${SELECT_LISTING_FIELDS}
        FROM listings l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN companies comp ON l.company_id = comp.id
        WHERE l.id IN (${placeholders})
      `, ids);

      const listings = rows.map(formatListing);

      if (!listings.length) {
        return res.status(404).json({ error: 'Listings not found' });
      }

      const dailyRates = listings.map((l: any) => Number(l.daily_rate) || 0);
      const weeklyRates = listings.map((l: any) => Number(l.weekly_rate) || 0).filter(r => r > 0);
      const deposits = listings.map((l: any) => Number(l.security_deposit) || 0);

      const lowestDaily = Math.min(...dailyRates);
      const lowestDailyItem = listings.find((l: any) => Number(l.daily_rate) === lowestDaily);

      // Value score calculation
      const scoredListings = listings.map((l: any) => {
        const rating = Number(l.rating) || 5.0;
        const rate = Number(l.daily_rate) || 1;
        const valueScore = Number(((rating * 20) / rate + (l.company?.is_verified ? 2 : 0)).toFixed(2));
        return { ...l, value_score: valueScore };
      });

      const bestValueItem = [...scoredListings].sort((a, b) => b.value_score - a.value_score)[0];

      res.json({
        listings: scoredListings,
        summary: {
          total_compared: listings.length,
          lowest_daily_rate: lowestDaily,
          lowest_daily_listing_id: lowestDailyItem?.id,
          best_value_listing_id: bestValueItem?.id,
          average_daily_rate: Number((dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length).toFixed(2)),
          average_security_deposit: Number((deposits.reduce((a, b) => a + b, 0) / deposits.length).toFixed(2)),
          average_weekly_rate: weeklyRates.length ? Number((weeklyRates.reduce((a, b) => a + b, 0) / weeklyRates.length).toFixed(2)) : 0
        }
      });
    } catch (err: any) {
      console.error('Error fetching compare listings:', err);
      res.status(500).json({ error: 'Failed to generate comparison' });
    }
  });

  async function handleCreateListing(req: any, res: Response) {
    try {
      const data = parseListingData(req);

      if (!data.title || !data.description) {
        return res.status(422).json({
          message: 'Title and description are required',
          errors: {
            title: !data.title ? ['Title is required'] : undefined,
            name: !data.title ? ['Name is required'] : undefined,
            description: !data.description ? ['Description is required'] : undefined,
          }
        });
      }

      const userId = req.user?.id || 1;

      const { lastID } = await runSql(`
        INSERT INTO listings (
          user_id, category_id, company_id, title, description, daily_rate, weekly_rate, monthly_rate, security_deposit,
          location, address, lat, lng, status, available_from, available_to, rating, image_url, images, agreement_text, agreement_document
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, ?, ?, ?, ?)
      `, [
        userId,
        data.category_id,
        data.company_id || null,
        data.title,
        data.description,
        data.daily_rate,
        data.weekly_rate,
        data.monthly_rate,
        data.security_deposit,
        data.location,
        data.address,
        data.lat,
        data.lng,
        data.status,
        data.available_from,
        data.available_to,
        data.mainImage,
        data.imagesJson,
        data.agreement_text,
        data.agreement_document
      ]);

      const newRow = await queryOne(`
        SELECT ${SELECT_LISTING_FIELDS}
        FROM listings l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN companies comp ON l.company_id = comp.id
        WHERE l.id = ?
      `, [lastID]);

      res.status(201).json(formatListing(newRow));
    } catch (err: any) {
      console.error('Error creating listing:', err);
      res.status(500).json({ message: 'Failed to create listing', error: err.message });
    }
  }

  async function handleUpdateListing(req: any, res: Response) {
    try {
      const listingId = Number(req.params.id);
      const existing = await queryOne('SELECT * FROM listings WHERE id = ?', [listingId]);
      if (!existing) return res.status(404).json({ error: 'Listing not found' });

      if (existing.user_id !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const data = parseListingData(req);

      await runSql(`
        UPDATE listings SET 
          title = COALESCE(?, title),
          company_id = CASE WHEN ? IS NOT NULL THEN ? ELSE company_id END,
          description = COALESCE(?, description),
          daily_rate = COALESCE(?, daily_rate),
          weekly_rate = COALESCE(?, weekly_rate),
          monthly_rate = COALESCE(?, monthly_rate),
          security_deposit = COALESCE(?, security_deposit),
          location = COALESCE(?, location),
          address = COALESCE(?, address),
          lat = COALESCE(?, lat),
          lng = COALESCE(?, lng),
          status = COALESCE(?, status),
          image_url = COALESCE(?, image_url),
          images = COALESCE(?, images),
          agreement_text = COALESCE(?, agreement_text),
          agreement_document = CASE WHEN ? != '' THEN ? ELSE agreement_document END
        WHERE id = ?
      `, [
        data.title || null,
        data.company_id, data.company_id,
        data.description || null,
        data.daily_rate || null,
        data.weekly_rate,
        data.monthly_rate,
        data.security_deposit,
        data.location || null,
        data.address || null,
        data.lat !== null && data.lat !== undefined ? data.lat : null,
        data.lng !== null && data.lng !== undefined ? data.lng : null,
        data.status || null,
        data.mainImage || null,
        data.imagesJson || null,
        data.agreement_text || null,
        data.agreement_document,
        data.agreement_document,
        listingId
      ]);

      const updated = await queryOne(`
        SELECT ${SELECT_LISTING_FIELDS}
        FROM listings l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN companies comp ON l.company_id = comp.id
        WHERE l.id = ?
      `, [listingId]);

      res.json(formatListing(updated));
    } catch (err: any) {
      console.error('Error updating listing:', err);
      res.status(500).json({ message: 'Failed to update listing', error: err.message });
    }
  }

  app.post('/api/listings', authenticateToken, upload.any(), handleCreateListing);
  app.put('/api/listings/:id', authenticateToken, upload.any(), handleUpdateListing);
  app.post('/api/listings/:id', authenticateToken, upload.any(), handleUpdateListing);

  app.delete('/api/listings/:id', authenticateToken, async (req: any, res: Response) => {
    const listingId = Number(req.params.id);
    const existing = await queryOne('SELECT * FROM listings WHERE id = ?', [listingId]);
    if (!existing) return res.status(404).json({ error: 'Listing not found' });

    if (existing.user_id !== req.user?.id && !req.user?.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await runSql('DELETE FROM listings WHERE id = ?', [listingId]);
    res.json({ message: 'Listing deleted' });
  });

  async function handleSaveCompany(req: any, res: Response) {
    try {
      const isUpdate = req.params.slug != null;
      const body = req.body || {};
      const name = String(body.name || '').trim();

      if (!isUpdate && !name) {
        return res.status(422).json({
          message: 'Company name is required',
          errors: { name: ['Company name is required'] }
        });
      }

      let existingCompany: any = null;
      if (isUpdate) {
        existingCompany = await queryOne('SELECT * FROM companies WHERE slug = ?', [req.params.slug]);
        if (!existingCompany) return res.status(404).json({ error: 'Company not found' });
        if (existingCompany.owner_id !== req.user.id && !req.user.is_admin) {
          return res.status(403).json({ error: 'Unauthorized to update this company' });
        }
      }

      let baseSlug = isUpdate ? existingCompany.slug : slugify(name);
      if (!isUpdate) {
        const checkSlug = await queryOne('SELECT id FROM companies WHERE slug = ?', [baseSlug]);
        if (checkSlug) {
          baseSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
        }
      }

      let logoPath = isUpdate ? existingCompany.logo : '';
      let coverPath = isUpdate ? existingCompany.cover_image : '';
      let licenseDocPath = isUpdate ? existingCompany.license_document : '';
      let companyImagesList = isUpdate ? safeJsonParse(existingCompany.company_images, []) : [];

      if (req.files && Array.isArray(req.files)) {
        for (const f of req.files) {
          const url = `/uploads/${f.filename}`;
          if (f.fieldname === 'logo') logoPath = url;
          else if (f.fieldname === 'cover_image') coverPath = url;
          else if (f.fieldname === 'license_document') licenseDocPath = url;
          else if (f.fieldname === 'company_images[]' || f.fieldname === 'company_images') {
            companyImagesList.push(url);
          }
        }
      }

      if (body.remove_images) {
        let removeArr: string[] = [];
        if (Array.isArray(body.remove_images)) removeArr = body.remove_images;
        else if (typeof body.remove_images === 'string') {
          try { removeArr = JSON.parse(body.remove_images); } catch { removeArr = [body.remove_images]; }
        }
        companyImagesList = companyImagesList.filter((img: string) => !removeArr.includes(img));
      }

      const certsJson = typeof body.certifications === 'string' ? body.certifications : JSON.stringify(body.certifications || []);
      const offersJson = typeof body.offers === 'string' ? body.offers : JSON.stringify(body.offers || []);
      const socialJson = typeof body.social_links === 'string' ? body.social_links : JSON.stringify(body.social_links || []);
      const hoursJson = typeof body.working_hours === 'string' ? body.working_hours : JSON.stringify(body.working_hours || {});

      if (isUpdate) {
        await runSql(`
          UPDATE companies SET
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            logo = CASE WHEN ? != '' THEN ? ELSE logo END,
            cover_image = CASE WHEN ? != '' THEN ? ELSE cover_image END,
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            postal_code = COALESCE(?, postal_code),
            country = COALESCE(?, country),
            latitude = COALESCE(?, latitude),
            longitude = COALESCE(?, longitude),
            phone = COALESCE(?, phone),
            email = COALESCE(?, email),
            website = COALESCE(?, website),
            license_number = COALESCE(?, license_number),
            license_document = CASE WHEN ? != '' THEN ? ELSE license_document END,
            certifications = COALESCE(?, certifications),
            insurance_info = COALESCE(?, insurance_info),
            founded_year = COALESCE(?, founded_year),
            agreement_text = COALESCE(?, agreement_text),
            payment_terms = COALESCE(?, payment_terms),
            bank_account_info = COALESCE(?, bank_account_info),
            vat_number = COALESCE(?, vat_number),
            company_images = ?,
            offers = COALESCE(?, offers),
            social_links = COALESCE(?, social_links),
            working_hours = COALESCE(?, working_hours)
          WHERE slug = ?
        `, [
          name || null,
          body.description !== undefined ? body.description : null,
          logoPath, logoPath,
          coverPath, coverPath,
          body.address !== undefined ? body.address : null,
          body.city !== undefined ? body.city : null,
          body.state !== undefined ? body.state : null,
          body.postal_code !== undefined ? body.postal_code : null,
          body.country !== undefined ? body.country : null,
          parseNum(body.latitude),
          parseNum(body.longitude),
          body.phone !== undefined ? body.phone : null,
          body.email !== undefined ? body.email : null,
          body.website !== undefined ? body.website : null,
          body.license_number !== undefined ? body.license_number : null,
          licenseDocPath, licenseDocPath,
          certsJson,
          body.insurance_info !== undefined ? body.insurance_info : null,
          parseNum(body.founded_year),
          body.agreement_text !== undefined ? body.agreement_text : null,
          body.payment_terms !== undefined ? body.payment_terms : null,
          body.bank_account_info !== undefined ? body.bank_account_info : null,
          body.vat_number !== undefined ? body.vat_number : null,
          JSON.stringify(companyImagesList),
          offersJson,
          socialJson,
          hoursJson,
          req.params.slug
        ]);

        const updated = await getCompanyFullDetail(req.params.slug);
        return res.json(updated);
      } else {
        const { lastID } = await runSql(`
          INSERT INTO companies (
            owner_id, name, slug, description, logo, cover_image, address, city, state, postal_code, country,
            latitude, longitude, phone, email, website, license_number, license_document, certifications,
            insurance_info, founded_year, agreement_text, payment_terms, bank_account_info, vat_number,
            company_images, offers, social_links, working_hours, is_verified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          req.user.id,
          name,
          baseSlug,
          body.description || '',
          logoPath,
          coverPath,
          body.address || '',
          body.city || '',
          body.state || '',
          body.postal_code || '',
          body.country || '',
          parseNum(body.latitude),
          parseNum(body.longitude),
          body.phone || '',
          body.email || '',
          body.website || '',
          body.license_number || '',
          licenseDocPath,
          certsJson,
          body.insurance_info || '',
          parseNum(body.founded_year),
          body.agreement_text || '',
          body.payment_terms || '',
          body.bank_account_info || '',
          body.vat_number || '',
          JSON.stringify(companyImagesList),
          offersJson,
          socialJson,
          hoursJson
        ]);

        const created = await getCompanyFullDetail(lastID);
        return res.status(201).json(created);
      }
    } catch (err: any) {
      console.error('Error saving company:', err);
      return res.status(500).json({ message: 'Failed to save company', error: err.message });
    }
  }

  // COMPANIES ROUTES
  app.get('/api/companies', async (req: Request, res: Response) => {
    const companies = await queryAll(`
      SELECT c.*, u.name as owner_name, u.email as owner_email, u.avatar as owner_avatar,
             (SELECT COUNT(*) FROM listings l WHERE l.company_id = c.id) as listings_count
      FROM companies c
      LEFT JOIN users u ON c.owner_id = u.id
      ORDER BY c.id DESC
    `);
    
    const formatted = companies.map(c => ({
      ...c,
      is_verified: !!c.is_verified,
      certifications: safeJsonParse(c.certifications, []),
      offers: safeJsonParse(c.offers, []),
      social_links: safeJsonParse(c.social_links, []),
      working_hours: safeJsonParse(c.working_hours, {}),
      owner: { id: c.owner_id, name: c.owner_name, email: c.owner_email, avatar: c.owner_avatar }
    }));

    res.json(formatted);
  });

  app.get('/api/my-companies', authenticateToken, async (req: any, res: Response) => {
    const companies = await queryAll(`
      SELECT c.*, u.name as owner_name, u.email as owner_email, u.avatar as owner_avatar,
             (SELECT COUNT(*) FROM listings l WHERE l.company_id = c.id) as listings_count
      FROM companies c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.owner_id = ?
      ORDER BY c.id DESC
    `, [req.user.id]);

    const formatted = companies.map(c => ({
      ...c,
      is_verified: !!c.is_verified,
      certifications: safeJsonParse(c.certifications, []),
      offers: safeJsonParse(c.offers, []),
      social_links: safeJsonParse(c.social_links, []),
      working_hours: safeJsonParse(c.working_hours, {}),
      owner: { id: c.owner_id, name: c.owner_name, email: c.owner_email, avatar: c.owner_avatar }
    }));

    res.json(formatted);
  });

  app.get('/api/companies/:slug', async (req: Request, res: Response) => {
    const company = await getCompanyFullDetail(req.params.slug);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  });

  app.post('/api/companies', authenticateToken, upload.any(), handleSaveCompany);
  app.put('/api/companies/:slug', authenticateToken, upload.any(), handleSaveCompany);
  app.post('/api/companies/:slug', authenticateToken, upload.any(), handleSaveCompany);

  app.delete('/api/companies/:slug', authenticateToken, async (req: any, res: Response) => {
    const company = await queryOne('SELECT * FROM companies WHERE slug = ?', [req.params.slug]);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    if (company.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await runSql('UPDATE listings SET company_id = NULL WHERE company_id = ?', [company.id]);
    await runSql('DELETE FROM companies WHERE id = ?', [company.id]);

    res.json({ message: 'Company deleted successfully' });
  });

  app.get('/api/companies/:slug/listings', async (req: Request, res: Response) => {
    const company = await queryOne('SELECT id FROM companies WHERE slug = ?', [req.params.slug]);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const rows = await queryAll(`
      SELECT ${SELECT_LISTING_FIELDS}
      FROM listings l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN companies comp ON l.company_id = comp.id
      WHERE l.company_id = ?
      ORDER BY l.id DESC
    `, [company.id]);

    const formatted = rows.map(formatListing);
    res.json({ data: formatted });
  });

  app.post('/api/companies/:slug/attach-listing', authenticateToken, async (req: any, res: Response) => {
    const company = await queryOne('SELECT id, owner_id FROM companies WHERE slug = ?', [req.params.slug]);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    if (company.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { listing_id } = req.body;
    if (!listing_id) return res.status(422).json({ error: 'listing_id is required' });

    await runSql('UPDATE listings SET company_id = ? WHERE id = ?', [company.id, listing_id]);
    res.json({ message: 'Listing attached to company successfully' });
  });

  app.delete('/api/companies/:slug/detach-listing/:listingId', authenticateToken, async (req: any, res: Response) => {
    const company = await queryOne('SELECT id, owner_id FROM companies WHERE slug = ?', [req.params.slug]);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    if (company.owner_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const listingId = Number(req.params.listingId);
    await runSql('UPDATE listings SET company_id = NULL WHERE id = ? AND company_id = ?', [listingId, company.id]);
    res.json({ message: 'Listing detached from company successfully' });
  });

  app.get('/api/companies/:slug/agreements', async (req: Request, res: Response) => {
    const company = await getCompanyFullDetail(req.params.slug);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    res.json({
      company_id: company.id,
      company_name: company.name,
      license_number: company.license_number,
      license_document: company.license_document,
      insurance_info: company.insurance_info,
      master_agreement_text: company.agreement_text,
      payment_terms: company.payment_terms,
      listings_count: company.listings_count,
      listings: company.listings.map((l: any) => ({
        id: l.id,
        title: l.title,
        agreement_text: l.agreement_text || company.agreement_text,
        agreement_document: l.agreement_document
      }))
    });
  });

  // PRODUCTS ALIASES
  app.get('/api/products', optionalAuth, (req: any, res: Response, next: NextFunction) => {
    req.url = '/api/listings' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    app._router.handle(req, res, next);
  });
  app.get('/api/my-products', authenticateToken, (req: any, res: Response, next: NextFunction) => {
    req.url = '/api/my-listings';
    app._router.handle(req, res, next);
  });
  app.post('/api/products', authenticateToken, upload.any(), handleCreateListing);
  app.get('/api/products/:id', (req: any, res: Response, next: NextFunction) => {
    req.url = `/api/listings/${req.params.id}`;
    app._router.handle(req, res, next);
  });
  app.put('/api/products/:id', authenticateToken, upload.any(), handleUpdateListing);
  app.post('/api/products/:id', authenticateToken, upload.any(), handleUpdateListing);
  app.delete('/api/products/:id', authenticateToken, (req: any, res: Response, next: NextFunction) => {
    req.url = `/api/listings/${req.params.id}`;
    app._router.handle(req, res, next);
  });

  app.get('/api/listings/:id/availability', (req: Request, res: Response) => {
    const listingId = Number(req.params.id);
    const blocked = unavailableDatesMap[listingId] || [];
    res.json({ blocked_dates: blocked });
  });

  app.post('/api/listings/:id/block-dates', authenticateToken, (req: Request, res: Response) => {
    const listingId = Number(req.params.id);
    const { dates } = req.body;
    if (!unavailableDatesMap[listingId]) unavailableDatesMap[listingId] = [];
    if (Array.isArray(dates)) {
      unavailableDatesMap[listingId].push(...dates);
    }
    res.json({ blocked_dates: unavailableDatesMap[listingId] });
  });

  // RENTAL REQUESTS & RENTALS
  async function fetchRentalRequests(whereClause: string, params: any[]) {
    const rows = await queryAll(`
      SELECT r.*,
             l.title as listing_title, l.image_url as listing_image, l.daily_rate as listing_daily_rate,
             u_renter.name as renter_name, u_renter.avatar as renter_avatar,
             u_owner.name as owner_name, u_owner.avatar as owner_avatar
      FROM rental_requests r
      LEFT JOIN listings l ON r.listing_id = l.id
      LEFT JOIN users u_renter ON r.renter_id = u_renter.id
      LEFT JOIN users u_owner ON r.owner_id = u_owner.id
      WHERE ${whereClause}
      ORDER BY r.id DESC
    `, params);

    return rows.map(r => ({
      id: r.id,
      listing_id: r.listing_id,
      renter_id: r.renter_id,
      owner_id: r.owner_id,
      start_date: r.start_date,
      end_date: r.end_date,
      total_days: r.total_days,
      total_price: r.total_price,
      security_deposit: r.security_deposit,
      status: r.status,
      payment_method: r.payment_method || 'card',
      payment_status: r.payment_status || 'paid',
      card_last_four: r.card_last_four || '4242',
      created_at: r.created_at,
      listing: { title: r.listing_title, image_url: r.listing_image, daily_rate: r.listing_daily_rate },
      renter: { id: r.renter_id, name: r.renter_name, avatar: r.renter_avatar },
      owner: { id: r.owner_id, name: r.owner_name, avatar: r.owner_avatar }
    }));
  }

  app.get('/api/rental-requests', authenticateToken, async (req: any, res: Response) => {
    const userId = req.user.id;
    const formatted = await fetchRentalRequests('r.renter_id = ? OR r.owner_id = ?', [userId, userId]);
    res.json({ data: formatted });
  });

  app.get('/api/rentals/mine', authenticateToken, async (req: any, res: Response) => {
    const userId = req.user.id;
    const formatted = await fetchRentalRequests('r.renter_id = ?', [userId]);
    res.json({ data: formatted });
  });

  app.get('/api/rentals/lendings', authenticateToken, async (req: any, res: Response) => {
    const userId = req.user.id;
    const formatted = await fetchRentalRequests('r.owner_id = ?', [userId]);
    res.json({ data: formatted });
  });

  async function handleCreateRentalRequest(req: any, res: Response) {
    const { listing_id, start_date, end_date, payment_method, card_last_four } = req.body;
    const listing = await queryOne('SELECT * FROM listings WHERE id = ?', [listing_id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const start = new Date(start_date || Date.now());
    const end = new Date(end_date || Date.now());
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const totalPrice = totalDays * (listing.daily_rate || 0);

    const method = String(payment_method || 'card');
    const lastFour = String(card_last_four || (method === 'card' ? '4242' : '----'));
    const payStatus = method === 'cash' ? 'pending_in_person' : 'paid';

    const { lastID } = await runSql(`
      INSERT INTO rental_requests (listing_id, renter_id, owner_id, start_date, end_date, total_days, total_price, security_deposit, status, payment_method, payment_status, card_last_four)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `, [listing_id, req.user?.id || 1, listing.user_id, start_date || '2026-08-01', end_date || '2026-08-05', totalDays, totalPrice, listing.security_deposit || 0, method, payStatus, lastFour]);

    const newRequest = await queryOne('SELECT * FROM rental_requests WHERE id = ?', [lastID]);
    res.status(201).json(newRequest);
  }

  app.post('/api/rental-requests', authenticateToken, handleCreateRentalRequest);
  app.post('/api/rentals', authenticateToken, handleCreateRentalRequest);
  app.post('/api/rentals/request', authenticateToken, handleCreateRentalRequest);

  app.put('/api/rental-requests/:id/accept', authenticateToken, async (req: any, res: Response) => {
    const reqId = Number(req.params.id);
    const rentalReq = await queryOne('SELECT * FROM rental_requests WHERE id = ?', [reqId]);
    if (!rentalReq) return res.status(404).json({ error: 'Rental request not found' });

    if (rentalReq.owner_id !== req.user?.id && !req.user?.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await runSql('UPDATE rental_requests SET status = "accepted" WHERE id = ?', [reqId]);
    res.json({ message: 'Request accepted' });
  });

  const handleDeclineRental = async (req: any, res: Response) => {
    const reqId = Number(req.params.id);
    const rentalReq = await queryOne('SELECT * FROM rental_requests WHERE id = ?', [reqId]);
    if (!rentalReq) return res.status(404).json({ error: 'Rental request not found' });

    if (rentalReq.owner_id !== req.user?.id && !req.user?.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await runSql('UPDATE rental_requests SET status = "declined" WHERE id = ?', [reqId]);
    res.json({ message: 'Request declined' });
  };

  app.put('/api/rental-requests/:id/decline', authenticateToken, handleDeclineRental);
  app.put('/api/rental-requests/:id/reject', authenticateToken, handleDeclineRental);

  app.put('/api/rental-requests/:id/cancel', authenticateToken, async (req: any, res: Response) => {
    const reqId = Number(req.params.id);
    const rentalReq = await queryOne('SELECT * FROM rental_requests WHERE id = ?', [reqId]);
    if (!rentalReq) return res.status(404).json({ error: 'Rental request not found' });

    if (rentalReq.renter_id !== req.user?.id && rentalReq.owner_id !== req.user?.id && !req.user?.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await runSql('UPDATE rental_requests SET status = "cancelled" WHERE id = ?', [reqId]);
    res.json({ message: 'Request cancelled' });
  });

  app.put('/api/rental-requests/:id/start', authenticateToken, async (req: any, res: Response) => {
    const reqId = Number(req.params.id);
    const rentalReq = await queryOne('SELECT * FROM rental_requests WHERE id = ?', [reqId]);
    if (!rentalReq) return res.status(404).json({ error: 'Rental request not found' });

    await runSql('UPDATE rental_requests SET status = "active" WHERE id = ?', [reqId]);
    res.json({ message: 'Rental started' });
  });

  app.put('/api/rental-requests/:id/complete', authenticateToken, async (req: any, res: Response) => {
    const reqId = Number(req.params.id);
    const rentalReq = await queryOne('SELECT * FROM rental_requests WHERE id = ?', [reqId]);
    if (!rentalReq) return res.status(404).json({ error: 'Rental request not found' });

    await runSql('UPDATE rental_requests SET status = "completed" WHERE id = ?', [reqId]);
    res.json({ message: 'Rental completed' });
  });

  // MESSAGES
  app.get('/api/messages', authenticateToken, async (req: any, res: Response) => {
    const userId = req.user.id;
    const rows = await queryAll(`
      SELECT m.*,
             s.name as sender_name, s.avatar as sender_avatar,
             r.name as receiver_name, r.avatar as receiver_avatar
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.receiver_id = r.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.id ASC
    `, [userId, userId]);

    res.json({ data: rows });
  });

  app.post('/api/messages', authenticateToken, async (req: any, res: Response) => {
    const { receiver_id, content, listing_id } = req.body;
    if (!receiver_id || !content) {
      return res.status(422).json({ error: 'Receiver and content are required' });
    }

    const { lastID } = await runSql(`
      INSERT INTO messages (sender_id, receiver_id, listing_id, content)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, receiver_id, listing_id || null, content]);

    const newMsg = await queryOne('SELECT * FROM messages WHERE id = ?', [lastID]);
    res.status(201).json(newMsg);
  });

  // REVIEWS
  app.get('/api/reviews', async (req: Request, res: Response) => {
    const { listing_id, user_id, owner_id } = req.query;
    let sql = `
      SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar, l.title as listing_title
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
    `;
    const params: any[] = [];
    const targetOwner = owner_id || user_id;

    if (listing_id) {
      sql += ` WHERE r.listing_id = ?`;
      params.push(Number(listing_id));
    } else if (targetOwner) {
      sql += ` WHERE l.user_id = ?`;
      params.push(Number(targetOwner));
    }
    sql += ` ORDER BY r.id DESC`;

    const reviews = await queryAll(sql, params);
    const formatted = reviews.map(r => ({
      id: r.id,
      listing_id: r.listing_id,
      listing_title: r.listing_title,
      rating: Number(r.rating),
      comment: r.comment,
      created_at: r.created_at,
      reviewer: { id: r.reviewer_id, name: r.reviewer_name, avatar: r.reviewer_avatar }
    }));

    res.json({ data: formatted });
  });

  app.get('/api/reviews/mine', authenticateToken, async (req: any, res: Response) => {
    const rows = await queryAll(`
      SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar, l.title as listing_title
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE r.reviewer_id = ?
      ORDER BY r.id DESC
    `, [req.user.id]);

    const formatted = rows.map(r => ({
      id: r.id,
      listing_id: r.listing_id,
      listing_title: r.listing_title,
      rating: Number(r.rating),
      comment: r.comment,
      created_at: r.created_at,
      reviewer: { id: r.reviewer_id, name: r.reviewer_name, avatar: r.reviewer_avatar }
    }));

    res.json({ data: formatted });
  });

  app.post('/api/reviews', authenticateToken, async (req: any, res: Response) => {
    const { listing_id, rating, comment } = req.body;
    if (!listing_id || !rating) {
      return res.status(400).json({ error: 'Listing ID and rating are required' });
    }

    const numericRating = Math.min(5, Math.max(1, Number(rating) || 5));

    const { lastID } = await runSql(`
      INSERT INTO reviews (reviewer_id, listing_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, Number(listing_id), numericRating, comment || '']);

    // Recalculate average rating for this listing
    const avgResult = await queryOne<{ avg_rating: number; total: number }>(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE listing_id = ?
    `, [Number(listing_id)]);

    if (avgResult && avgResult.avg_rating) {
      const newAvg = Number(avgResult.avg_rating.toFixed(1));
      await runSql('UPDATE listings SET rating = ? WHERE id = ?', [newAvg, Number(listing_id)]);
    }

    const newRev = await queryOne(`
      SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.id = ?
    `, [lastID]);

    res.status(201).json({
      id: newRev.id,
      listing_id: newRev.listing_id,
      rating: Number(newRev.rating),
      comment: newRev.comment,
      created_at: newRev.created_at,
      reviewer: { id: newRev.reviewer_id, name: newRev.reviewer_name, avatar: newRev.reviewer_avatar }
    });
  });

  // SAVED SEARCHES
  app.get('/api/saved-searches', authenticateToken, (req: any, res: Response) => {
    res.json({ data: [] });
  });

  app.post('/api/saved-searches', authenticateToken, (req: any, res: Response) => {
    res.status(201).json({ id: Date.now(), ...req.body });
  });

  app.delete('/api/saved-searches/:id', authenticateToken, (req: any, res: Response) => {
    res.json({ message: 'Deleted' });
  });

  // RENTALS (defined above with rich fetchRentalRequests)

  // FAVORITES
  app.get('/api/favorites', authenticateToken, async (req: any, res: Response) => {
    const rows = await queryAll(`
      SELECT f.id as favorite_id, l.*,
             u.name as user_name, u.email as user_email, u.phone as user_phone, u.avatar as user_avatar,
             c.name as category_name, c.slug as category_slug, c.icon as category_icon
      FROM favorites f
      JOIN listings l ON f.listing_id = l.id
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE f.user_id = ?
    `, [req.user.id]);

    const formatted = rows.map(r => ({ id: r.favorite_id, listing: formatListing(r) }));
    res.json({ data: formatted });
  });

  app.post('/api/favorites', authenticateToken, async (req: any, res: Response) => {
    const { listing_id } = req.body;
    try {
      const { lastID } = await runSql('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)', [req.user.id, listing_id]);
      res.status(201).json({ id: lastID, listing_id });
    } catch {
      res.json({ message: 'Already favorited' });
    }
  });

  app.delete('/api/favorites/:listing_id', authenticateToken, async (req: any, res: Response) => {
    await runSql('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', [req.user.id, req.params.listing_id]);
    res.json({ message: 'Removed from favorites' });
  });

  // NOTIFICATION PREFERENCES & NOTIFICATIONS
  app.get('/api/notifications', authenticateToken, (req: any, res: Response) => {
    res.json({ notifications: [], data: [] });
  });

  app.get('/api/notifications/unread-count', authenticateToken, (req: any, res: Response) => {
    res.json({ count: 0 });
  });

  app.put('/api/notifications/read-all', authenticateToken, (req: any, res: Response) => {
    res.json({ message: 'All notifications marked as read' });
  });

  app.put('/api/notifications/:id/read', authenticateToken, (req: any, res: Response) => {
    res.json({ message: 'Notification marked as read' });
  });

  app.get('/api/notification-preferences', authenticateToken, (req: any, res: Response) => {
    const prefs = notificationPreferencesMap[req.user.id] || { user_id: req.user.id, email_notifications: true, message_notifications: true, rental_notifications: true };
    res.json(prefs);
  });

  app.put('/api/notification-preferences', authenticateToken, (req: any, res: Response) => {
    notificationPreferencesMap[req.user.id] = { user_id: req.user.id, ...req.body };
    res.json(notificationPreferencesMap[req.user.id]);
  });

  // ------------------ ADMIN PANEL API ------------------
  const requireAdminMiddleware = async (req: any, res: Response, next: Function) => {
    try {
      const u = await queryOne('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (!u || (u.is_admin !== 1 && u.is_admin !== true)) {
        return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
      }
      next();
    } catch {
      res.status(500).json({ error: 'Failed to verify admin status' });
    }
  };

  app.get('/api/admin/stats', authenticateToken, requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const usersCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
      const listingsCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM listings');
      const companiesCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM companies');
      const rentalsCount = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM rental_requests');
      const revenueRow = await queryOne<{ total: number }>('SELECT SUM(total_price) as total FROM rental_requests WHERE status IN ("approved", "completed")');

      res.json({
        total_users: usersCount?.count || 0,
        total_listings: listingsCount?.count || 0,
        total_companies: companiesCount?.count || 0,
        total_rentals: rentalsCount?.count || 0,
        total_volume: revenueRow?.total || 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/users', authenticateToken, requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const users = await queryAll(`
        SELECT u.id, u.name, u.email, u.phone, u.address, u.is_admin, u.avatar, u.created_at,
               (SELECT COUNT(*) FROM listings WHERE user_id = u.id) as listings_count,
               (SELECT COUNT(*) FROM rental_requests WHERE renter_id = u.id) as rentals_count
        FROM users u
        ORDER BY u.id DESC
      `);
      res.json({ users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/users/:id/admin', authenticateToken, requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const { is_admin } = req.body;
      await runSql('UPDATE users SET is_admin = ? WHERE id = ?', [is_admin ? 1 : 0, req.params.id]);
      res.json({ message: 'User role updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/users/:id', authenticateToken, requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      await runSql('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/listings', authenticateToken, requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const rows = await queryAll(`
        SELECT l.*,
               u.name as user_name, u.email as user_email,
               c.name as category_name,
               comp.name as company_name
        FROM listings l
        LEFT JOIN users u ON l.user_id = u.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN companies comp ON l.company_id = comp.id
        ORDER BY l.id DESC
      `);
      const formatted = rows.map(r => formatListing(r));
      res.json({ listings: formatted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/listings/:id', authenticateToken, requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      await runSql('DELETE FROM listings WHERE id = ?', [req.params.id]);
      res.json({ message: 'Listing deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/companies', authenticateToken, requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const companies = await queryAll(`
        SELECT c.*, u.name as owner_name, u.email as owner_email,
               (SELECT COUNT(*) FROM listings WHERE company_id = c.id) as total_listings
        FROM companies c
        LEFT JOIN users u ON c.owner_id = u.id
        ORDER BY c.id DESC
      `);
      res.json({ companies });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/companies/:id/verify', authenticateToken, requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      const { is_verified } = req.body;
      await runSql('UPDATE companies SET is_verified = ? WHERE id = ?', [is_verified ? 1 : 0, req.params.id]);
      res.json({ message: 'Company verification status updated' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/companies/:id', authenticateToken, requireAdminMiddleware, async (req: Request, res: Response) => {
    try {
      await runSql('DELETE FROM companies WHERE id = ?', [req.params.id]);
      res.json({ message: 'Company deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ------------------ JACKPOT / WEEKLY SPOTLIGHT DRAW API ------------------
  app.get('/api/jackpot/current', async (req: Request, res: Response) => {
    try {
      const activeDraw = await queryOne(`
        SELECT jd.*, l.daily_rate, l.description, l.location, l.rating, l.images,
               u.email as winner_email, u.phone as winner_phone, u.avatar as winner_avatar,
               c.name as category_name, c.icon as category_icon,
               comp.name as company_name, comp.slug as company_slug, comp.logo as company_logo
        FROM jackpot_draws jd
        LEFT JOIN listings l ON jd.winner_listing_id = l.id
        LEFT JOIN users u ON jd.winner_user_id = u.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN companies comp ON l.company_id = comp.id
        WHERE jd.is_active = 1
        ORDER BY jd.id DESC LIMIT 1
      `);

      // Count entries / candidates
      const candidatesCountRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM listings WHERE status = "available"');
      const entriesCountRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM jackpot_entries');

      let listingFormatted = null;
      if (activeDraw && activeDraw.winner_listing_id) {
        const fullListingRow = await queryOne(`
          SELECT l.*,
                 u.name as user_name, u.email as user_email, u.phone as user_phone, u.avatar as user_avatar,
                 c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                 comp.name as company_name, comp.slug as company_slug, comp.logo as company_logo,
                 comp.cover_image as company_cover_image, comp.is_verified as company_is_verified,
                 comp.agreement_text as company_agreement_text
          FROM listings l
          LEFT JOIN users u ON l.user_id = u.id
          LEFT JOIN categories c ON l.category_id = c.id
          LEFT JOIN companies comp ON l.company_id = comp.id
          WHERE l.id = ?
        `, [activeDraw.winner_listing_id]);
        if (fullListingRow) {
          listingFormatted = formatListing(fullListingRow);
        }
      }

      res.json({
        winner: activeDraw ? {
          ...activeDraw,
          listing: listingFormatted
        } : null,
        total_candidates: candidatesCountRow?.count || 0,
        total_entries: entriesCountRow?.count || 0,
      });
    } catch (error: any) {
      console.error('Error fetching current jackpot:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/jackpot/history', async (req: Request, res: Response) => {
    try {
      const history = await queryAll(`
        SELECT jd.*, l.daily_rate, l.location, l.image_url as listing_image,
               u.avatar as winner_avatar
        FROM jackpot_draws jd
        LEFT JOIN listings l ON jd.winner_listing_id = l.id
        LEFT JOIN users u ON jd.winner_user_id = u.id
        ORDER BY jd.id DESC
      `);
      res.json({ data: history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/jackpot/candidates', async (req: Request, res: Response) => {
    try {
      const rows = await queryAll(`
        SELECT l.*,
               u.name as user_name, u.email as user_email, u.avatar as user_avatar,
               c.name as category_name, c.icon as category_icon,
               comp.name as company_name, comp.logo as company_logo
        FROM listings l
        JOIN users u ON l.user_id = u.id
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN companies comp ON l.company_id = comp.id
        ORDER BY l.rating DESC, l.id DESC
      `);
      const formatted = rows.map(r => formatListing(r));
      res.json({ candidates: formatted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/jackpot/enter', authenticateToken, async (req: any, res: Response) => {
    try {
      const { listing_id, week_label } = req.body;
      if (!listing_id) {
        return res.status(400).json({ error: 'listing_id is required' });
      }
      const label = week_label || 'Current Week Draw';
      const { lastID } = await runSql(`
        INSERT INTO jackpot_entries (user_id, listing_id, week_label)
        VALUES (?, ?, ?)
      `, [req.user.id, listing_id, label]);

      res.status(201).json({ message: 'Listing successfully entered into Weekly Jackpot Draw!', entry_id: lastID });
    } catch (error: any) {
      res.status(400).json({ error: 'Already entered this listing or invalid entry.' });
    }
  });

  app.post('/api/jackpot/draw', authenticateToken, async (req: any, res: Response) => {
    try {
      // Check admin
      const currentUser = await queryOne('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (!currentUser || !currentUser.is_admin) {
        return res.status(403).json({ error: 'Admin authorization required to run the weekly jackpot draw' });
      }

      const { winner_listing_id, week_label, prize_description } = req.body;
      if (!winner_listing_id) {
        return res.status(400).json({ error: 'winner_listing_id is required' });
      }

      const listing = await queryOne(`
        SELECT l.*, u.name as user_name, u.id as user_id
        FROM listings l
        JOIN users u ON l.user_id = u.id
        WHERE l.id = ?
      `, [winner_listing_id]);

      if (!listing) {
        return res.status(404).json({ error: 'Selected listing not found' });
      }

      // Deactivate all previous active draws
      await runSql('UPDATE jackpot_draws SET is_active = 0');

      const label = week_label || `Week ${Math.ceil(new Date().getDate() / 7)} - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`;
      const prize = prize_description || '🌟 #1 Top App Banner Spotlight + 0% Commission for 30 Days';
      const img = listing.image_url || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600';

      const { lastID } = await runSql(`
        INSERT INTO jackpot_draws (week_label, winner_user_id, winner_listing_id, winner_product_title, winner_user_name, winner_image_url, prize_description, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `, [label, listing.user_id, listing.id, listing.title, listing.user_name, img, prize]);

      const created = await queryOne('SELECT * FROM jackpot_draws WHERE id = ?', [lastID]);
      res.status(201).json({ message: 'New weekly jackpot winner crowned successfully!', winner: created });
    } catch (error: any) {
      console.error('Error drawing jackpot:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/jackpot/set-active/:id', authenticateToken, async (req: any, res: Response) => {
    try {
      const currentUser = await queryOne('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (!currentUser || !currentUser.is_admin) {
        return res.status(403).json({ error: 'Admin authorization required' });
      }
      await runSql('UPDATE jackpot_draws SET is_active = 0');
      await runSql('UPDATE jackpot_draws SET is_active = 1 WHERE id = ?', [req.params.id]);
      res.json({ message: 'Active jackpot winner updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/jackpot/:id', authenticateToken, async (req: any, res: Response) => {
    try {
      const currentUser = await queryOne('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);
      if (!currentUser || !currentUser.is_admin) {
        return res.status(403).json({ error: 'Admin authorization required' });
      }
      await runSql('DELETE FROM jackpot_draws WHERE id = ?', [req.params.id]);
      res.json({ message: 'Jackpot record deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve static uploads
  app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

  // ------------------ VITE / FRONTEND ------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      configFile: path.resolve(__dirname, 'vite.config.js')
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'public/spa')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'public/spa/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening with SQL database storage on http://0.0.0.0:${PORT}`);
  });
}

startServer();
