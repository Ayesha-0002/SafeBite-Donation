import { execSync } from "child_process";

try {
  const cmd = process.argv.slice(2).join(" ");
  console.log(`Running: ${cmd}`);
  const out = execSync(cmd, { encoding: "utf-8" });
  console.log("Output:\n", out);
} catch (err: any) {
  console.error("Error executing command:", err.stderr || err.message);
}
