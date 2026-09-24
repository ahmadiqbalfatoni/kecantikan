/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Standard
 * @file page.tsx
 * @description File untuk konfigurasi koneksi database menggunakan Knex.js dengan dukungan multi-tenant dan caching koneksi.
 * 
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-07-14
 * 
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * 
 * @lastModified Fadil (2026-08-03)
 * @version 1.0.1
 */


import knex from "knex";
import knexConfig from "../../knexfile.js";
import { AsyncLocalStorage } from "async_hooks"

export const dbContext = new AsyncLocalStorage();

class DatabaseManager {
  constructor() {
    this.connections = new Map();
    this.defaultEnv = "default";
    this.maxCachedConnections = 50;

    const currentEnv = process.env.NODE_ENV || 'development';

    this.baseConfig = knexConfig.default || knexConfig[currentEnv] || knexConfig['development'];

    this.connections.set(this.defaultEnv, {
      instance: knex(this.baseConfig),
      lastAccessed: Date.now()
    });
  }

  getDefault() {
    return this.connections.get(this.defaultEnv).instance;
  }

  async getTenantDB(tenantKey, databaseName, customOverrides = null) {
    if (!tenantKey || !databaseName) throw new Error("Invalid parameters");

    // CACHE HIT: Jika koneksi sudah ada
    if (this.connections.has(tenantKey)) {
      const cached = this.connections.get(tenantKey);

      // PERBARUI TIMESTAMP: Tandai bahwa tenant ini BARU SAJA aktif.
      // Ini menyelamatkan dia dari "Kematian" saat pembersihan nanti.
      cached.lastAccessed = Date.now();

      return cached.instance;
    }

    // GARBAGE COLLECTION: Hapus yang paling lama idle (LRU Algorithm)
    if (this.connections.size >= this.maxCachedConnections) {
      await this._evictLongestIdleConnection();
    }

    // Custom Config
    let tenantConfig = {
      ...this.baseConfig,
      connection: { ...this.baseConfig.connection, database: databaseName }
    };
    if (customOverrides) {
      tenantConfig.connection = {
        ...tenantConfig.connection,
        ...(customOverrides.host && { host: customOverrides.host }),
        ...(customOverrides.port && { port: Number(customOverrides.port) }),
        ...(customOverrides.username && { user: customOverrides.username }),
        ...(customOverrides.password && { password: customOverrides.password })
      };
    }

    // first time generate instance
    const tenantInstance = knex(tenantConfig);
    this.connections.set(tenantKey, {
      instance: tenantInstance,
      lastAccessed: Date.now() // Waktu pertama kali dibuat
    });

    return tenantInstance;
  }



  // async _evictLongestIdleConnection() {
  //   let oldestKey = null;
  //   let oldestTime = Date.now();

  //   // Cari koneksi paling lama 
  //   for (const [key, cacheObj] of this.connections.entries()) {
  //     // jangan pernah hapus koneksi default
  //     if (key !== this.defaultEnv && cacheObj.lastAccessed < oldestTime) {
  //       oldestTime = cacheObj.lastAccessed;
  //       oldestKey = key;
  //     }
  //   }

  //   // LRU Function
  //   if (oldestKey) {
  //     const targetCache = this.connections.get(oldestKey);
  //     try {
  //       // Graceful shutdown
  //       await targetCache.instance.destroy();
  //     } catch (err) {
  //       console.error(`[DB_MANAGER] Gagal menghancurkan koneksi idle ${oldestKey}:`, err);
  //     }

  //     // Hapus dari RAM
  //     this.connections.delete(oldestKey);
  //   }
  // }

  async _evictLongestIdleConnection() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, cacheObj] of this.connections.entries()) {
      if (key !== this.defaultEnv && cacheObj.lastAccessed < oldestTime) {
        const pool = cacheObj.instance.client.pool;
        if (pool && typeof pool.numUsed === 'function') {
          const activeConnections = pool.numUsed();
          if (activeConnections === 0) {
            oldestTime = cacheObj.lastAccessed;
            oldestKey = key;
          }
        }
      }
    }

    if (oldestKey) {
      const targetCache = this.connections.get(oldestKey);
      try {
        // WAJIB menggunakan timeout, agar tidak blocking jika socket freeze
        await Promise.race([
          targetCache.instance.destroy(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Destroy Timeout')), 5000))
        ]);
      } catch (e) {
        console.error(`[DB_MANAGER] Force killing stale connection ${oldestKey} due to:`, e.message);
      } finally {
        // Tetap hapus dari Map memori Node.js terlepas DB berhasil disconnect atau timeout
        this.connections.delete(oldestKey);
      }
    }
  }
}

export const dbManager = new DatabaseManager();
export const defaultDb = dbManager.getDefault();

const DB = new Proxy(function () { }, {
  // Menangani panggilan fungsi langsung: DB("nama_tabel")
  apply(target, thisArg, argumentsList) {
    const store = dbContext.getStore();
    const activeDb = (store && store.tenantDb) ? store.tenantDb : defaultDb;
    return activeDb(...argumentsList);
  },
  // Menangani pemanggilan properti/metode: DB.select(), DB.raw(), DB.transaction()
  get(target, prop, receiver) {
    const store = dbContext.getStore();
    const activeDb = (store && store.tenantDb) ? store.tenantDb : defaultDb;
    const value = Reflect.get(activeDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(activeDb);
    }
    return value;
  }
});

export default DB;