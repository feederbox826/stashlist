import "dotenv/config";
import { init } from "./server";
import { setup } from "./utils/db";

async function main() {
  await setup();
  await init();
}
main();
