const http = require("http");

const API_HOST = "localhost";
const API_PORT = 4000;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const data = options.body ? options.body : null;
    const req = http.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path: path,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(
                new Error(
                  parsed.error || parsed.message || `HTTP ${res.statusCode}`,
                ),
              );
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Invalid JSON: ${body}`));
          }
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  try {
    // 1. Nafarha Login (sab possible fields bhej rahe hain)
    console.log("1. Logging in as nafarha...");
    const nafarha = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: "nafarha",
        username: "nafarha",
        phone: "nafarha",
        password: "milaan123",
      }),
    });

    // 2. Riya Login
    console.log("2. Logging in as riya_07...");
    const riya = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: "riya_07",
        username: "riya_07",
        phone: "riya_07",
        password: "milaan123",
      }),
    });

    // 3. Riya ka ID nikalo
    console.log("3. Finding Riya ID...");
    const searchRiya = await request("/social/search?q=riya_07", {
      headers: { Authorization: `Bearer ${nafarha.accessToken}` },
    });
    const riyaId = searchRiya.results[0].userId;
    console.log(`   Riya ID: ${riyaId}`);

    // 4. Nafarha ka ID nikalo
    console.log("4. Finding Nafarha ID...");
    const searchNafarha = await request("/social/search?q=nafarha", {
      headers: { Authorization: `Bearer ${riya.accessToken}` },
    });
    const nafarhaId = searchNafarha.results[0].userId;
    console.log(`   Nafarha ID: ${nafarhaId}`);

    // 5. Nafarha like Riya
    console.log("5. Nafarha likes Riya...");
    const like1 = await request("/matches/decide", {
      method: "POST",
      headers: { Authorization: `Bearer ${nafarha.accessToken}` },
      body: JSON.stringify({ targetId: riyaId, decision: "interested" }),
    });
    console.log("   Like Result:", like1);

    // 6. Riya like Nafarha
    console.log("6. Riya likes Nafarha...");
    const matchResult = await request("/matches/decide", {
      method: "POST",
      headers: { Authorization: `Bearer ${riya.accessToken}` },
      body: JSON.stringify({ targetId: nafarhaId, decision: "interested" }),
    });
    console.log("   Match Result:", matchResult);

    // 7. Nafarha ke Likes
    console.log("7. Nafarha incoming likes...");
    const likes = await request("/matches/likes", {
      headers: { Authorization: `Bearer ${nafarha.accessToken}` },
    });
    console.log("   Likes:", JSON.stringify(likes, null, 2));

    // 8. Nafarha ke Matches
    console.log("8. Nafarha matches...");
    const matches = await request("/matches", {
      headers: { Authorization: `Bearer ${nafarha.accessToken}` },
    });
    console.log("   Matches:", JSON.stringify(matches, null, 2));

    console.log("✅ TEST SUCCESSFUL! Ab app mein refresh karke check karo.");
  } catch (err) {
    console.error("❌ TEST FAILED:", err.message);
  }
}

run();
