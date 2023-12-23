import "dotenv/config";
import { init } from "./server";
import { setup } from "./utils/db";

async function main() {
  // eslint-disable-next-line no-console
  console.log("Trying to connect to database...");
  await setup();
  await init();
}
main();
