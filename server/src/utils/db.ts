// config
import "dotenv/config";
// external
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL);

// sql migration
export async function setup() {
  await sql`CREATE TABLE IF NOT EXISTS users (
        apikey UUID,
        id SERIAL PRIMARY KEY
    );`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_apikey ON users (apikey);`;
  await sql`CREATE TABLE IF NOT EXISTS stashids (
        id UUID PRIMARY KEY
    );`;
  await sql`CREATE TABLE IF NOT EXISTS lists (
        userid INT,
        stashid uuid,
        listtype INT,
        FOREIGN KEY (userid) REFERENCES users(id),
        FOREIGN KEY (stashid) REFERENCES stashids(id),
        PRIMARY KEY (userid, stashid)
    );`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS list_index ON lists (userid, stashid, listtype);`;
}

export default sql;
