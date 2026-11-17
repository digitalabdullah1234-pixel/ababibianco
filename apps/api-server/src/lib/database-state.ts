// Tracks whether the database has been migrated and seeded, so routes can
// avoid waiting on a database that is not there yet.
export type DatabaseState = "not_configured" | "connecting" | "ready";

let state: DatabaseState = "connecting";

export function getDatabaseState(): DatabaseState {
  return state;
}

export function setDatabaseState(next: DatabaseState): void {
  state = next;
}
