/**
 * DuckDB Connection Manager
 *
 * Manages DuckDB adapter instances with connection pooling.
 * Singleton per connection to avoid re-attaching databases.
 */

import { DuckDBUniversalAdapter } from '@repo/liquid-connect/uvb';
import type { knosiaConnection } from '@turbostarter/db/schema';

type Connection = typeof knosiaConnection.$inferSelect;

interface ManagedConnection {
  adapter: DuckDBUniversalAdapter;
  connectionId: string;
  lastUsed: Date;
  inUse: boolean;
}

class DuckDBConnectionManager {
  private connections = new Map<string, ManagedConnection>();
  private maxIdleTime = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Build connection string from connection details
   */
  private buildConnectionString(connection: Connection): string {
    const credentials = connection.credentials
      ? (JSON.parse(connection.credentials as string) as Record<string, unknown>)
      : ({} as Record<string, unknown>);
    const username = (credentials.username as string | undefined) || '';
    const password = (credentials.password as string | undefined) || '';

    switch (connection.type) {
      case 'postgres': {
        const port = connection.port || 5432;
        const auth = username && password ? `${username}:${password}@` : '';
        return `postgresql://${auth}${connection.host}:${port}/${connection.database}`;
      }

      case 'mysql': {
        const port = connection.port || 3306;
        const auth = username && password ? `${username}:${password}@` : '';
        return `mysql://${auth}${connection.host}:${port}/${connection.database}`;
      }

      case 'duckdb': {
        // For DuckDB, the database field contains the file path
        return connection.database;
      }

      default:
        throw new Error(`Unsupported connection type: ${connection.type}`);
    }
  }

  /**
   * Get or create adapter for connection
   */
  async getAdapter(connection: Connection): Promise<DuckDBUniversalAdapter> {
    const existing = this.connections.get(connection.id);

    if (existing) {
      existing.lastUsed = new Date();
      existing.inUse = true;
      return existing.adapter;
    }

    // Create new adapter
    const adapter = new DuckDBUniversalAdapter({
      attachedName: `conn_${connection.id.replace(/-/g, '_')}`,
    });

    const connectionString = this.buildConnectionString(connection);
    await adapter.connect(connectionString);

    this.connections.set(connection.id, {
      adapter,
      connectionId: connection.id,
      lastUsed: new Date(),
      inUse: true,
    });

    return adapter;
  }

  /**
   * Release adapter (mark as not in use)
   */
  release(connectionId: string): void {
    const managed = this.connections.get(connectionId);
    if (managed) {
      managed.inUse = false;
      managed.lastUsed = new Date();
    }
  }

  /**
   * Disconnect and remove adapter
   */
  async disconnect(connectionId: string): Promise<void> {
    const managed = this.connections.get(connectionId);
    if (managed) {
      await managed.adapter.disconnect();
      this.connections.delete(connectionId);
    }
  }

  /**
   * Disconnect all adapters
   */
  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this.connections.keys()).map(id => this.disconnect(id))
    );
  }

  /**
   * Clean up idle connections
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();

      for (const [id, managed] of this.connections.entries()) {
        if (
          !managed.inUse &&
          now - managed.lastUsed.getTime() > this.maxIdleTime
        ) {
          await this.disconnect(id);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Stop cleanup (for graceful shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const duckdbManager = new DuckDBConnectionManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
  duckdbManager.stopCleanup();
  await duckdbManager.disconnectAll();
});
