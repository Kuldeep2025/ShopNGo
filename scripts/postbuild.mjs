// On Render (RENDER=true) apply migrations and seed the catalogue after the build.
import { execSync } from "node:child_process";
if (process.env.RENDER !== "true" || process.env.SKIP_DB_SETUP === "1") {
  console.log("postbuild: skipping database setup");
  process.exit(0);
}
for (const cmd of ["npx prisma migrate deploy", "npx prisma db seed"]) {
  console.log(`postbuild: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}
