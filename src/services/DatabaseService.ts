import * as SQLite from 'expo-sqlite';
import { Restaurant, Visit, MenuItem, Photo, RestaurantWithStats, VisitWithDetails } from '../models/types';

// Database singleton
let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync('whatsgood.db');
    
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS restaurants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        latitude REAL,
        longitude REAL,
        phone TEXT,
        website TEXT,
        cuisine TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        server_id TEXT,
        last_synced_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        restaurant_id INTEGER NOT NULL,
        visit_date TEXT NOT NULL,
        overall_rating INTEGER NOT NULL CHECK(overall_rating >= 1 AND overall_rating <= 5),
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        server_id TEXT,
        last_synced_at TEXT,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_id INTEGER NOT NULL,
        restaurant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        notes TEXT,
        photo_uri TEXT,
        category TEXT,
        would_order_again INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        server_id TEXT,
        last_synced_at TEXT,
        FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visit_id INTEGER,
        menu_item_id INTEGER,
        restaurant_id INTEGER,
        uri TEXT NOT NULL,
        caption TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        server_id TEXT,
        last_synced_at TEXT,
        FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_visits_restaurant ON visits(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_menu_items_visit ON menu_items(visit_id);
      CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_photos_visit ON photos(visit_id);
    `);

    // Migrations for new columns (safe to run repeatedly)
    await db.execAsync(`
      ALTER TABLE restaurants ADD COLUMN dog_friendly INTEGER DEFAULT 0;
    `).catch(() => {});
    await db.execAsync(`
      ALTER TABLE restaurants ADD COLUMN outside_seating INTEGER DEFAULT 0;
    `).catch(() => {});
    await db.execAsync(`
      ALTER TABLE restaurants ADD COLUMN rating REAL;
    `).catch(() => {});

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

const BOOLEAN_FIELDS = new Set(['dogFriendly', 'outsideSeating', 'wouldOrderAgain']);

// Helper to convert snake_case to camelCase and coerce SQLite integers to booleans
const toCamelCase = (obj: any): any => {
  if (!obj) return obj;

  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    newObj[camelKey] = BOOLEAN_FIELDS.has(camelKey) ? Boolean(obj[key]) : obj[key];
  });
  return newObj;
};

export const DatabaseService = {
  // Restaurant operations
  async getAllRestaurants(): Promise<Restaurant[]> {
    const db = getDatabase();
    const results = await db.getAllAsync('SELECT * FROM restaurants ORDER BY name');
    return results.map(toCamelCase);
  },

  async getRestaurantById(id: number): Promise<Restaurant | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync('SELECT * FROM restaurants WHERE id = ?', [id]);
    return result ? toCamelCase(result) : null;
  },

  async getRestaurantsWithStats(): Promise<RestaurantWithStats[]> {
    const db = getDatabase();
    const results = await db.getAllAsync(`
      SELECT 
        r.*,
        COUNT(DISTINCT v.id) as visit_count,
        COALESCE(AVG(v.overall_rating), 0) as average_rating,
        MAX(v.visit_date) as last_visit_date
      FROM restaurants r
      LEFT JOIN visits v ON r.id = v.restaurant_id
      GROUP BY r.id
      ORDER BY r.name
    `);
    return results.map(toCamelCase);
  },

  async createRestaurant(restaurant: Omit<Restaurant, 'id'>): Promise<number> {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO restaurants (name, address, latitude, longitude, phone, website, cuisine, notes, dog_friendly, outside_seating, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        restaurant.name,
        restaurant.address || null,
        restaurant.latitude || null,
        restaurant.longitude || null,
        restaurant.phone || null,
        restaurant.website || null,
        restaurant.cuisine || null,
        restaurant.notes || null,
        restaurant.dogFriendly ? 1 : 0,
        restaurant.outsideSeating ? 1 : 0,
        restaurant.rating ?? null,
      ]
    );
    return result.lastInsertRowId;
  },

  async updateRestaurant(id: number, restaurant: Partial<Restaurant>): Promise<void> {
    const db = getDatabase();
    const fields = Object.keys(restaurant)
      .filter(key => key !== 'id')
      .map(key => `${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`);
    const values = Object.keys(restaurant)
      .filter(key => key !== 'id')
      .map(key => {
        const value = (restaurant as any)[key];
        if (key === 'dogFriendly' || key === 'outsideSeating') return value ? 1 : 0;
        return value;
      });
    
    await db.runAsync(
      `UPDATE restaurants SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  },

  async deleteRestaurant(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM restaurants WHERE id = ?', [id]);
  },

  async searchRestaurants(query: string): Promise<Restaurant[]> {
    const db = getDatabase();
    const results = await db.getAllAsync(
      `SELECT * FROM restaurants 
       WHERE name LIKE ? OR cuisine LIKE ? OR address LIKE ?
       ORDER BY name`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );
    return results.map(toCamelCase);
  },

  // Visit operations
  async getVisitsByRestaurant(restaurantId: number): Promise<Visit[]> {
    const db = getDatabase();
    const results = await db.getAllAsync(
      'SELECT * FROM visits WHERE restaurant_id = ? ORDER BY visit_date DESC',
      [restaurantId]
    );
    return results.map(toCamelCase);
  },

  async getVisitById(id: number): Promise<Visit | null> {
    const db = getDatabase();
    const result = await db.getFirstAsync('SELECT * FROM visits WHERE id = ?', [id]);
    return result ? toCamelCase(result) : null;
  },

  async getVisitWithDetails(id: number): Promise<VisitWithDetails | null> {
    const visit = await this.getVisitById(id);
    if (!visit || !visit.id) return null;

    const restaurant = await this.getRestaurantById(visit.restaurantId);
    const menuItems = await this.getMenuItemsByVisit(visit.id);
    const photos = await this.getPhotosByVisit(visit.id);

    if (!restaurant) return null;

    return {
      ...visit,
      restaurant,
      menuItems,
      photos
    };
  },

  async createVisit(visit: Omit<Visit, 'id'>): Promise<number> {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO visits (restaurant_id, visit_date, overall_rating, notes) 
       VALUES (?, ?, ?, ?)`,
      [visit.restaurantId, visit.visitDate, visit.overallRating, visit.notes || null]
    );
    return result.lastInsertRowId;
  },

  async updateVisit(id: number, visit: Partial<Visit>): Promise<void> {
    const db = getDatabase();
    const fields = Object.keys(visit)
      .filter(key => key !== 'id')
      .map(key => `${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`);
    const values = Object.keys(visit)
      .filter(key => key !== 'id')
      .map(key => (visit as any)[key]);
    
    await db.runAsync(
      `UPDATE visits SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  },

  async deleteVisit(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM visits WHERE id = ?', [id]);
  },

  // MenuItem operations
  async getMenuItemsByVisit(visitId: number): Promise<MenuItem[]> {
    const db = getDatabase();
    const results = await db.getAllAsync(
      'SELECT * FROM menu_items WHERE visit_id = ? ORDER BY created_at',
      [visitId]
    );
    return results.map(toCamelCase);
  },

  async getMenuItemsByRestaurant(restaurantId: number): Promise<MenuItem[]> {
    const db = getDatabase();
    const results = await db.getAllAsync(
      'SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY rating DESC, created_at DESC',
      [restaurantId]
    );
    return results.map(toCamelCase);
  },

  async getTopMenuItems(restaurantId: number, limit: number = 5): Promise<MenuItem[]> {
    const db = getDatabase();
    const results = await db.getAllAsync(
      `SELECT * FROM menu_items 
       WHERE restaurant_id = ? AND would_order_again = 1
       ORDER BY rating DESC, created_at DESC 
       LIMIT ?`,
      [restaurantId, limit]
    );
    return results.map(toCamelCase);
  },

  async createMenuItem(item: Omit<MenuItem, 'id'>): Promise<number> {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO menu_items (visit_id, restaurant_id, name, description, price, rating, notes, photo_uri, category, would_order_again) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.visitId,
        item.restaurantId,
        item.name,
        item.description || null,
        item.price || null,
        item.rating,
        item.notes || null,
        item.photoUri || null,
        item.category || null,
        item.wouldOrderAgain ? 1 : 0
      ]
    );
    return result.lastInsertRowId;
  },

  async updateMenuItem(id: number, item: Partial<MenuItem>): Promise<void> {
    const db = getDatabase();
    const fields = Object.keys(item)
      .filter(key => key !== 'id')
      .map(key => `${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`);
    const values = Object.keys(item)
      .filter(key => key !== 'id')
      .map(key => {
        const value = (item as any)[key];
        if (key === 'wouldOrderAgain') return value ? 1 : 0;
        return value;
      });
    
    await db.runAsync(
      `UPDATE menu_items SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  },

  async deleteMenuItem(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM menu_items WHERE id = ?', [id]);
  },

  // Photo operations
  async getPhotosByRestaurant(restaurantId: number): Promise<Photo[]> {
    const db = getDatabase();
    const results = await db.getAllAsync(
      'SELECT * FROM photos WHERE restaurant_id = ? AND visit_id IS NULL ORDER BY created_at DESC',
      [restaurantId]
    );
    return results.map(toCamelCase);
  },

  async getPhotosByVisit(visitId: number): Promise<Photo[]> {
    const db = getDatabase();
    const results = await db.getAllAsync(
      'SELECT * FROM photos WHERE visit_id = ? ORDER BY created_at',
      [visitId]
    );
    return results.map(toCamelCase);
  },

  async createPhoto(photo: Omit<Photo, 'id'>): Promise<number> {
    const db = getDatabase();
    const result = await db.runAsync(
      `INSERT INTO photos (visit_id, menu_item_id, restaurant_id, uri, caption) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        photo.visitId || null,
        photo.menuItemId || null,
        photo.restaurantId || null,
        photo.uri,
        photo.caption || null
      ]
    );
    return result.lastInsertRowId;
  },

  async deletePhoto(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM photos WHERE id = ?', [id]);
  },

  // Settings
  async getSetting(key: string): Promise<string | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?', [key]
    );
    return row?.value ?? null;
  },

  async setSetting(key: string, value: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
  },

  async deleteSetting(key: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
  },
};
