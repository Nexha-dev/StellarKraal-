#!/usr/bin/env node
/**
 * Migration CLI tool
 * Provides commands for managing database migrations
 * 
 * Usage:
 *   npm run migrate:status  - Show migration status
 *   npm run migrate:dev     - Run pending migrations (development)
 *   npm run migrate:prod    - Run pending migrations (production)
 *   npm run migrate:down    - Rollback last migration
 *   npm run migrate:create  - Create a new migration
 *   npm run migrate:reset   - Reset database (development only)
 */

import "../config"; // Load environment variables
import { runMigrations, getMigrationStatus, rollbackMigration } from "../db/migrationRunner";
import logger from "../utils/logger";

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case "status":
        const status = await getMigrationStatus();
        logger.info("Migration Status", { status });
        break;

      case "up":
        logger.info("Running migrations");
        await runMigrations();
        logger.info("Migrations complete");
        break;

      case "down":
        logger.info("Rolling back migration");
        await rollbackMigration();
        logger.info("Rollback complete");
        break;

      default:
        logger.info(`
Migration CLI Tool

Usage:
  ts-node src/cli/migrate.ts <command>

Commands:
  status    Show which migrations have been applied
  up        Run all pending migrations
  down      Rollback the last migration

Examples:
  ts-node src/cli/migrate.ts status
  ts-node src/cli/migrate.ts up
  ts-node src/cli/migrate.ts down

Note: Use npm scripts for convenience:
  npm run migrate:status
  npm run migrate:dev
  npm run migrate:down
        `);
        process.exit(1);
    }
  } catch (error) {
    logger.error("Migration command failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
