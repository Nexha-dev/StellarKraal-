import { SorobanRpc } from "@stellar/stellar-sdk";

const { Server } = SorobanRpc;

const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export interface PoolStats {
  size: number;
  available: number;
  inUse: number;
  min: number;
  max: number;
}

class PoolExhaustedError extends Error {
  constructor() {
    super("Connection pool exhausted");
    this.name = "PoolExhaustedError";
  }
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

class ConnectionPool {
  private pool: SorobanRpc.Server[] = [];
  private inUse = new Set<SorobanRpc.Server>();
  readonly min: number;
  readonly max: number;

  constructor(min: number, max: number) {
    this.min = min;
    this.max = max;
    for (let i = 0; i < min; i++) {
      this.pool.push(new Server(RPC_URL));
    }
  }

  acquire(): SorobanRpc.Server {
    if (this.pool.length > 0) {
      const conn = this.pool.pop()!;
      this.inUse.add(conn);
      return conn;
    }
    if (this.inUse.size < this.max) {
      const conn = new Server(RPC_URL);
      this.inUse.add(conn);
      return conn;
    }
    throw new PoolExhaustedError();
  }

  release(conn: SorobanRpc.Server): void {
    this.inUse.delete(conn);
    if (this.pool.length + this.inUse.size < this.max) {
      this.pool.push(conn);
    }
  }

  stats(): PoolStats {
    return {
      size: this.pool.length + this.inUse.size,
      available: this.pool.length,
      inUse: this.inUse.size,
      min: this.min,
      max: this.max,
    };
  }

  async run<T>(fn: (server: SorobanRpc.Server) => Promise<T>): Promise<T> {
    const conn = this.acquire();
    try {
      return await withRetry(() => fn(conn));
    } finally {
      this.release(conn);
    }
  }

  /**
   * Close all connections in the pool.
   * Should be called during graceful shutdown.
   */
  close(): void {
    this.pool = [];
    this.inUse.clear();
  }
}

const POOL_MIN = parseInt(process.env.POOL_MIN || "2", 10);
const POOL_MAX = parseInt(process.env.POOL_MAX || "10", 10);

export const pool = new ConnectionPool(POOL_MIN, POOL_MAX);
export { PoolExhaustedError };
