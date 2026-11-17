// Run with: npm run smoke -- https://your-site.example.com   (EXPECT_STAGE=1 to also check the release stage)
import { runSmoke } from "../src/lib/smoke-test";

async function main() {
  const url = process.argv[2];
  if (!url || !/^https?:\/\//.test(url)) throw new Error("Give the address of the site, for example: npm run smoke -- https://staging.example.com");
  const expectStage = process.env.EXPECT_STAGE ? Number(process.env.EXPECT_STAGE) : undefined;

  console.log(`Checking ${url}\n`);
  const results = await runSmoke(url, { expectStage });
  for (const result of results) console.log(`${result.ok ? "OK  " : "FAIL"}  ${result.name}: ${result.detail}`);
  if (results.some((r) => !r.ok)) {
    console.log("\nThe site is not healthy.");
    process.exitCode = 1;
  } else console.log("\nThe site is healthy.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
