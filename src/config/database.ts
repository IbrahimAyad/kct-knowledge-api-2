import { Pool } from 'pg';
import * as sqlite3 from 'sqlite3';
import { logger } from '../utils/logger';

export interface DatabaseConfig {
  type: 'postgresql' | 'sqlite';
  connection: any;
}

class DatabaseService {
  private pool: Pool | null = null;
  private sqlite: sqlite3.Database | null = null;
  private config: DatabaseConfig | null = null;

  async initialize(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL || 'sqlite::memory:';
    const databaseType = process.env.DATABASE_TYPE as 'postgresql' | 'sqlite' || 
      (databaseUrl.startsWith('postgres') ? 'postgresql' : 'sqlite');
    const databaseEnabled = process.env.DATABASE_ENABLED !== 'false';
    
    // Debug logging
    logger.info(`🔍 Database config: type=${databaseType}, url=${databaseUrl ? 'present' : 'missing'}, enabled=${databaseEnabled}`);

    if (!databaseEnabled) {
      logger.info('📊 Database is disabled (DATABASE_ENABLED=false)');
      return;
    }

    try {
      if (databaseType === 'postgresql' && databaseUrl) {
        logger.info('🐘 Attempting PostgreSQL connection...');
        await this.initializePostgreSQL(databaseUrl);
      } else if (databaseType === 'sqlite') {
        logger.info('💿 Attempting SQLite connection...');
        await this.initializeSQLite();
      }
    } catch (error) {
      logger.error('❌ Database initialization failed:', error);
      // For production, continue without database rather than crash
      if (process.env.NODE_ENV === 'production') {
        logger.warn('⚠️ Continuing without database in production mode');
        return;
      }
      throw error;
    }

    if (this.config) {
      logger.info(`✅ Database initialized with ${databaseType}`);
    }
  }

  private async initializePostgreSQL(connectionString: string): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.config = {
        type: 'postgresql',
        connection: this.pool
      };

      logger.info('PostgreSQL connection established successfully');
    } catch (error) {
      logger.error('Failed to initialize PostgreSQL:', error);
      throw error;
    }
  }

  private async initializeSQLite(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbPath = process.env.SQLITE_PATH || ':memory:'; // Use in-memory DB in production
      
      this.sqlite = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('Failed to initialize SQLite:', err);
          reject(err);
        } else {
          this.config = {
            type: 'sqlite',
            connection: this.sqlite
          };
          logger.info(`SQLite connection established successfully (${dbPath === ':memory:' ? 'in-memory' : 'file-based'})`);
          resolve();
        }
      });
    });
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.config) {
      logger.warn('⚠️ Database query attempted but database not initialized - returning empty result');
      return [];
    }

    if (this.config.type === 'postgresql' && this.pool) {
      // Convert SQLite-style ? parameters to PostgreSQL-style $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${paramIndex}`);
        paramIndex++;
      }
      
      const client = await this.pool.connect();
      try {
        const result = await client.query(pgSql, params);
        return result.rows;
      } finally {
        client.release();
      }
    } else if (this.config.type === 'sqlite' && this.sqlite) {
      return new Promise((resolve, reject) => {
        this.sqlite!.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });
    }

    throw new Error('Invalid database configuration');
  }

  async execute(sql: string, params: any[] = []): Promise<{ insertId?: number; changes?: number }> {
    if (!this.config) {
      logger.warn('⚠️ Database execute attempted but database not initialized - operation skipped');
      return { insertId: undefined, changes: 0 };
    }

    if (this.config.type === 'postgresql' && this.pool) {
      // Convert SQLite-style ? parameters to PostgreSQL-style $1, $2, etc.
      let pgSql = sql;
      let paramIndex = 1;
      while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${paramIndex}`);
        paramIndex++;
      }
      
      const client = await this.pool.connect();
      try {
        const result = await client.query(pgSql, params);
        return {
          insertId: result.rows[0]?.id,
          changes: result.rowCount ?? 0
        };
      } finally {
        client.release();
      }
    } else if (this.config.type === 'sqlite' && this.sqlite) {
      return new Promise((resolve, reject) => {
        this.sqlite!.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ insertId: this.lastID, changes: this.changes });
          }
        });
      });
    }

    throw new Error('Invalid database configuration');
  }

  async createTables(): Promise<void> {
    if (!this.config) {
      throw new Error('Database not initialized');
    }

    const tables = this.getDatabaseSchema();
    
    for (const table of tables) {
      try {
        await this.execute(table);
        logger.info(`✅ Created/verified table: ${this.extractTableName(table)}`);
      } catch (error) {
        logger.error(`❌ Failed to create table: ${this.extractTableName(table)}`, error);
        throw error;
      }
    }

    // Run migrations to add new columns to existing tables
    await this.runMigrations();

    // NOTE: FK constraints for conversation tables removed — those services are archived.
  }

  /**
   * Run database migrations to add new columns to existing tables
   */
  private async runMigrations(): Promise<void> {
    const isPostgreSQL = this.config?.type === 'postgresql';

    if (!isPostgreSQL) {
      // SQLite migrations would go here if needed
      return;
    }

    const migrations = [
      // Migration 1: Add IP geolocation columns to analytics_events
      {
        name: 'Add IP geolocation columns to analytics_events',
        statements: [
          `ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)`,
          `ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
          `ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS state VARCHAR(100)`,
          `ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS country VARCHAR(100)`,
          `CREATE INDEX IF NOT EXISTS idx_analytics_country ON analytics_events(country)`,
          `CREATE INDEX IF NOT EXISTS idx_analytics_city ON analytics_events(city)`,
          `CREATE INDEX IF NOT EXISTS idx_analytics_state ON analytics_events(state)`,
        ]
      }
    ];

    for (const migration of migrations) {
      logger.info(`🔄 Running migration: ${migration.name}`);
      for (const statement of migration.statements) {
        try {
          await this.execute(statement);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (!error.message?.includes('already exists') && !error.code?.includes('42701')) {
            logger.warn(`⚠️ Migration statement failed: ${error.message}`);
          }
        }
      }
      logger.info(`✅ Migration completed: ${migration.name}`);
    }
  }

  private getDatabaseSchema(): string[] {
    const isPostgreSQL = this.config?.type === 'postgresql';
    
    return [
      // NOTE: Conversation tables (conversations, conversation_messages, conversation_state,
      // conversation_outcomes, customer_preferences) removed — those services are archived.
      // Tables may still exist in the database but we no longer create or depend on them.

      // Analytics events table (unified event warehouse)
      `CREATE TABLE IF NOT EXISTS analytics_events (
        id ${isPostgreSQL ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        event_type VARCHAR(100) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        customer_email VARCHAR(255),
        page_url VARCHAR(500),
        user_agent TEXT,
        ip_address VARCHAR(45),
        city VARCHAR(100),
        country VARCHAR(100),
        event_data ${isPostgreSQL ? 'JSONB' : 'TEXT'},
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT ${isPostgreSQL ? 'NOW()' : 'CURRENT_TIMESTAMP'}
      )`,

      // Analytics events indexes (PostgreSQL only)
      ...(isPostgreSQL ? [
        `CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type)`,
        `CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_events(session_id)`,
        `CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp)`
        // Note: city and country indexes are created in migrations after columns are added
      ] : [])
    ];
  }

  private extractTableName(createStatement: string): string {
    const match = createStatement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    return match ? match[1] : 'unknown';
  }

  async getHealthInfo(): Promise<any> {
    if (!this.config) {
      return { status: 'disconnected', type: 'none' };
    }

    try {
      await this.query('SELECT 1');
      return {
        status: 'connected',
        type: this.config.type,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        type: this.config.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    if (this.sqlite) {
      await new Promise<void>((resolve) => {
        this.sqlite!.close((err) => {
          if (err) logger.error('Error closing SQLite:', err);
          resolve();
        });
      });
      this.sqlite = null;
    }
    this.config = null;
  }
}

export const databaseService = new DatabaseService();