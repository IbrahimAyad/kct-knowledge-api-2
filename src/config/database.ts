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
    const databaseUrl = process.env.DATABASE_URL;
    const databaseType = process.env.DATABASE_TYPE as 'postgresql' | 'sqlite' || 'sqlite';

    if (databaseType === 'postgresql' && databaseUrl) {
      await this.initializePostgreSQL(databaseUrl);
    } else {
      await this.initializeSQLite();
    }

    logger.info(`✅ Database initialized with ${databaseType}`);
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
      const dbPath = process.env.SQLITE_PATH || './data/chat.db';
      
      this.sqlite = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('Failed to initialize SQLite:', err);
          reject(err);
        } else {
          this.config = {
            type: 'sqlite',
            connection: this.sqlite
          };
          logger.info('SQLite connection established successfully');
          resolve();
        }
      });
    });
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.config) {
      throw new Error('Database not initialized');
    }

    if (this.config.type === 'postgresql' && this.pool) {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
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
      throw new Error('Database not initialized');
    }

    if (this.config.type === 'postgresql' && this.pool) {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return { insertId: result.rows[0]?.id, changes: result.rowCount };
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
  }

  private getDatabaseSchema(): string[] {
    const isPostgreSQL = this.config?.type === 'postgresql';
    
    return [
      // Conversations table
      `CREATE TABLE IF NOT EXISTS conversations (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'TEXT PRIMARY KEY'}, 
        customer_id TEXT,
        session_id TEXT UNIQUE NOT NULL,
        framework_type TEXT CHECK (framework_type IN ('atelier_ai', 'restore', 'precision')),
        current_stage TEXT,
        context ${isPostgreSQL ? 'JSONB' : 'TEXT'},
        started_at TIMESTAMP DEFAULT ${isPostgreSQL ? 'NOW()' : 'CURRENT_TIMESTAMP'},
        ended_at TIMESTAMP,
        status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
        satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 10),
        conversion_outcome BOOLEAN,
        created_at TIMESTAMP DEFAULT ${isPostgreSQL ? 'NOW()' : 'CURRENT_TIMESTAMP'},
        updated_at TIMESTAMP DEFAULT ${isPostgreSQL ? 'NOW()' : 'CURRENT_TIMESTAMP'}
      )`,
      
      // Messages table
      `CREATE TABLE IF NOT EXISTS conversation_messages (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'TEXT PRIMARY KEY'},
        conversation_id TEXT ${isPostgreSQL ? 'REFERENCES conversations(id) ON DELETE CASCADE' : ''},
        role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
        content TEXT NOT NULL,
        intent TEXT,
        confidence_score DECIMAL(3,2),
        response_layer INTEGER CHECK (response_layer IN (1, 2, 3)),
        context ${isPostgreSQL ? 'JSONB' : 'TEXT'},
        timestamp TIMESTAMP DEFAULT ${isPostgreSQL ? 'NOW()' : 'CURRENT_TIMESTAMP'}
      )`,
      
      // Conversation state table
      `CREATE TABLE IF NOT EXISTS conversation_state (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'TEXT PRIMARY KEY'},
        conversation_id TEXT ${isPostgreSQL ? 'REFERENCES conversations(id) ON DELETE CASCADE' : ''},
        state_key TEXT NOT NULL,
        state_value ${isPostgreSQL ? 'JSONB' : 'TEXT'},
        updated_at TIMESTAMP DEFAULT ${isPostgreSQL ? 'NOW()' : 'CURRENT_TIMESTAMP'},
        UNIQUE(conversation_id, state_key)
      )`,
      
      // Customer preferences table
      `CREATE TABLE IF NOT EXISTS customer_preferences (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'TEXT PRIMARY KEY'},
        customer_id TEXT NOT NULL,
        preference_key TEXT NOT NULL,
        preference_value ${isPostgreSQL ? 'JSONB' : 'TEXT'},
        learned_from_conversation_id TEXT,
        confidence_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT ${isPostgreSQL ? 'NOW()' : 'CURRENT_TIMESTAMP'},
        updated_at TIMESTAMP DEFAULT ${isPostgreSQL ? 'NOW()' : 'CURRENT_TIMESTAMP'},
        UNIQUE(customer_id, preference_key)
      )`,
      
      // Outcomes table for metrics tracking
      `CREATE TABLE IF NOT EXISTS conversation_outcomes (
        id ${isPostgreSQL ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'TEXT PRIMARY KEY'},
        conversation_id TEXT ${isPostgreSQL ? 'REFERENCES conversations(id) ON DELETE CASCADE' : ''},
        outcome_type TEXT CHECK (outcome_type IN ('conversion', 'satisfaction', 'resolution', 'escalation')),
        outcome_value DECIMAL(10,2),
        metadata ${isPostgreSQL ? 'JSONB' : 'TEXT'},
        recorded_at TIMESTAMP DEFAULT ${isPostgreSQL ? 'NOW()' : 'CURRENT_TIMESTAMP'}
      )`
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