import { createServer } from "node:http";

const PORT = 4000;

const server = createServer((req, res) => {
  const chunks = [];

  req.on("data", (chunk) => chunks.push(chunk));

  req.on("end", () => {
    const body = Buffer.concat(chunks).toString();
    const timestamp = new Date().toISOString();

    console.log(`\n[${timestamp}] ${req.method} ${req.url}`);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    if (body) console.log("Body:", body);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, received: true }));
  });
});

server.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
