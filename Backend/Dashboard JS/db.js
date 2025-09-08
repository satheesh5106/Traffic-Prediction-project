const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DB_PATH || './db/traffic.db';
  }

  async init() {
    try {
      // Ensure db directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize SQLite database
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Error opening database:', err.message);
          throw err;
        }
        console.log('✅ Connected to SQLite database:', this.dbPath);
      });

      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Create tables
      await this.createTables();
      
      console.log('✅ Database initialization completed');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    try {
      // Create routes table
      const createRoutesTable = `
        CREATE TABLE IF NOT EXISTS routes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          distance REAL NOT NULL,
          time INTEGER NOT NULL,
          traffic TEXT NOT NULL,
          fuelConsumption REAL NOT NULL,
          coordinates TEXT NOT NULL,
          weather TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `;

      // Create route_history table
      const createRouteHistoryTable = `
        CREATE TABLE IF NOT EXISTS route_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          route_id INTEGER,
          timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          user_id TEXT,
          action TEXT DEFAULT 'created',
          FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE
        )
      `;

      // Create indexes for better performance
      const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_route_history_route_id ON route_history(route_id)',
        'CREATE INDEX IF NOT EXISTS idx_route_history_timestamp ON route_history(timestamp)',
        'CREATE INDEX IF NOT EXISTS idx_route_history_user_id ON route_history(user_id)'
      ];

      await this.run(createRoutesTable);
      console.log('✅ Routes table created/verified');
      
      await this.run(createRouteHistoryTable);
      console.log('✅ Route history table created/verified');

      // Create indexes
      for (const indexQuery of createIndexes) {
        await this.run(indexQuery);
      }
      console.log('✅ Database indexes created/verified');

    } catch (error) {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
  }

  // Promisify database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Database run error:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Database get error:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Database all error:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Insert route with history tracking
  async insertRoute(routeData, userId = null) {
    try {
      const { name, distance, time, traffic, fuelConsumption, coordinates, weather } = routeData;
      
      const result = await this.run(
        `INSERT INTO routes (name, distance, time, traffic, fuelConsumption, coordinates, weather) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, distance, time, JSON.stringify(traffic), fuelConsumption, JSON.stringify(coordinates), JSON.stringify(weather)]
      );

      // Add to history
      await this.run(
        `INSERT INTO route_history (route_id, user_id, action) VALUES (?, ?, 'created')`,
        [result.id, userId]
      );

      console.log(`✅ Route inserted with ID: ${result.id}`);
      return result.id;
    } catch (error) {
      console.error('❌ Error inserting route:', error);
      throw error;
    }
  }

  // Get all routes with parsed JSON fields
  async getAllRoutes() {
    try {
      const routes = await this.all('SELECT * FROM routes ORDER BY created_at DESC');
      return routes.map(route => ({
        ...route,
        traffic: JSON.parse(route.traffic),
        coordinates: JSON.parse(route.coordinates),
        weather: JSON.parse(route.weather)
      }));
    } catch (error) {
      console.error('❌ Error getting routes:', error);
      throw error;
    }
  }

  // Get route statistics
  async getRouteStats() {
    try {
      const stats = await this.get(`
        SELECT 
          COUNT(*) as routesOptimized,
          SUM(time) as totalTime,
          SUM(fuelConsumption) as totalFuel,
          COUNT(CASE WHEN created_at > strftime('%s', 'now', '-24 hours') THEN 1 END) as activeRoutes
        FROM routes
      `);
      
      return {
        routesOptimized: stats.routesOptimized || 0,
        timeSaved: Math.round((stats.totalTime || 0) * 0.15), // Assume 15% time savings
        fuelSaved: Math.round((stats.totalFuel || 0) * 0.12), // Assume 12% fuel savings
        activeRoutes: stats.activeRoutes || 0
      };
    } catch (error) {
      console.error('❌ Error getting route stats:', error);
      throw error;
    }
  }

  // Close database connection
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
          } else {
            console.log('✅ Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;