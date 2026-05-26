# Runbook: Database Connection Failure

## Incident Description
The backend cannot communicate with the SQLite database (or primary DB), causing all read/write operations for off-chain data to fail.

## Detection Steps
- **Alerts**: Alerts firing for `DatabaseConnectionError` or `BackendHigh5xxRate`.
- **Logs**: Look for `Error: sqlite3 module not found`, `SQLITE_CANTOPEN: unable to open database file`, or `database is locked` in the backend logs.
- **Metrics**: 100% failure rate for API endpoints relying on the database.

## Impact Assessment
- **Criticality**: Critical
- **User Impact**: Complete service outage for off-chain functionality. Users cannot view their profiles, historical data, or off-chain state.

## Remediation Steps
1.  **Check Disk Space**: SQLite relies on the local filesystem. A full disk will prevent database access.
    ```bash
    df -h
    ```
    If full, clear old logs or temporary files.
2.  **Check File Permissions**: Ensure the backend process has read/write permissions to the `database.sqlite` file and its parent directory.
    ```bash
    ls -l /path/to/database.sqlite
    ```
3.  **Check for Locks**: If the database is locked (`SQLITE_BUSY`), a query may be deadlocked. Restarting the backend service usually releases the lock.
    ```bash
    docker-compose restart backend
    ```
4.  **Restore from Backup**: If the database file is corrupted, restore the latest backup.
    ```bash
    cp /backups/database-latest.sqlite /path/to/database.sqlite
    docker-compose restart backend
    ```

## Escalation Path
1.  If the database is corrupted and the backup is more than 24 hours old, escalate to the **Lead Backend Engineer**.
2.  Notify stakeholders in `#incidents`.
