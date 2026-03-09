const baseUrl = process.env.APP_URL ?? process.argv[2];

if (!baseUrl) {
  console.error("Usage: APP_URL=https://your-app.example.com npm run smoke:release");
  process.exit(1);
}

const checks = [
  { path: "/api/health", expected: [200] },
  { path: "/", expected: [200] },
  { path: "/articles", expected: [200] },
  { path: "/teams", expected: [200] },
  { path: "/umpires", expected: [200] },
];

if (process.env.SMOKE_ADMIN_PATH && process.env.SMOKE_ADMIN_COOKIE) {
  checks.push({
    path: process.env.SMOKE_ADMIN_PATH,
    expected: [200],
    headers: { cookie: process.env.SMOKE_ADMIN_COOKIE },
  });
}

let failures = 0;

for (const check of checks) {
  const response = await fetch(new URL(check.path, baseUrl), {
    headers: check.headers,
    redirect: "manual",
  });

  const pass = check.expected.includes(response.status);
  const label = `${response.status} ${check.path}`;
  if (pass) {
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL ${label} (expected ${check.expected.join(", ")})`);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log("Release smoke checks passed.");
