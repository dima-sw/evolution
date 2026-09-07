// Server statico minimale (zero dipendenze) per servire i moduli ES,
// + PROXY LLM: le API key restano SUL SERVER (il browser non deve mai vederle) e le richieste
// vengono inoltrate ai provider in CASCATA finché una risponde (failover).
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 5188;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml",
};

// ---- .env (parsing minimale, nessuna dipendenza) -------------------------------------------
const ENV = {};
try {
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) ENV[m[1]] = m[2].trim();
  }
} catch (e) { console.warn("Nessun .env trovato: l'AI dei leader resterà offline."); }

// ---- PROVIDER: ognuno sa costruire la richiesta ed estrarre il testo ------------------------
// L'ordine è quello del failover. Ogni provider è indipendente: se uno fallisce (chiave assente,
// rate limit, errore di rete), si passa al successivo senza fermare la simulazione.
const PROVIDERS = [
  {
    nome: "groq", key: () => ENV.GROQ_API_KEY,
    url: "https://api.groq.com/openai/v1/chat/completions",
    headers: (k) => ({ Authorization: `Bearer ${k}`, "Content-Type": "application/json" }),
    body: (p) => JSON.stringify({
      model: "llama-3.3-70b-versatile", temperature: p.temperature ?? 0.9, max_tokens: p.maxTokens ?? 900,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
    }),
    estrai: (j) => j.choices?.[0]?.message?.content,
  },
  {
    nome: "gemini", key: () => ENV.GEMINI_API_KEY,
    url: (k) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${k}`,
    headers: () => ({ "Content-Type": "application/json" }),
    body: (p) => JSON.stringify({
      systemInstruction: { parts: [{ text: p.system }] },
      contents: [{ role: "user", parts: [{ text: p.user }] }],
      generationConfig: { temperature: p.temperature ?? 0.9, maxOutputTokens: p.maxTokens ?? 900, responseMimeType: "application/json" },
    }),
    estrai: (j) => j.candidates?.[0]?.content?.parts?.map((x) => x.text).join(""),
  },
  {
    nome: "mistral", key: () => ENV.MISTRAL_API_KEY,
    url: "https://api.mistral.ai/v1/chat/completions",
    headers: (k) => ({ Authorization: `Bearer ${k}`, "Content-Type": "application/json" }),
    body: (p) => JSON.stringify({
      model: "mistral-small-latest", temperature: p.temperature ?? 0.9, max_tokens: p.maxTokens ?? 900,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
    }),
    estrai: (j) => j.choices?.[0]?.message?.content,
  },
  {
    nome: "openai", key: () => ENV.OPENAI_API_KEY,
    url: "https://api.openai.com/v1/chat/completions",
    headers: (k) => ({ Authorization: `Bearer ${k}`, "Content-Type": "application/json" }),
    body: (p) => JSON.stringify({
      model: ENV.OPENAI_CHAT_MODEL === "gpt-5-nano" ? "gpt-4o-mini" : (ENV.OPENAI_CHAT_MODEL || "gpt-4o-mini"),
      temperature: p.temperature ?? 0.9, max_tokens: p.maxTokens ?? 900,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
    }),
    estrai: (j) => j.choices?.[0]?.message?.content,
  },
  {
    nome: "deepseek", key: () => ENV.DEEPSEEK_API_KEY,
    url: "https://api.deepseek.com/chat/completions",
    headers: (k) => ({ Authorization: `Bearer ${k}`, "Content-Type": "application/json" }),
    body: (p) => JSON.stringify({
      model: "deepseek-chat", temperature: p.temperature ?? 0.9, max_tokens: p.maxTokens ?? 900,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
    }),
    estrai: (j) => j.choices?.[0]?.message?.content,
  },
  {
    nome: "openrouter", key: () => ENV.OPENROUTER_API_KEY,
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: (k) => ({ Authorization: `Bearer ${k}`, "Content-Type": "application/json" }),
    body: (p) => JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free", temperature: p.temperature ?? 0.9, max_tokens: p.maxTokens ?? 900,
      messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
    }),
    estrai: (j) => j.choices?.[0]?.message?.content,
  },
  {
    nome: "cohere", key: () => ENV.COHERE_API_KEY,
    url: "https://api.cohere.com/v2/chat",
    headers: (k) => ({ Authorization: `Bearer ${k}`, "Content-Type": "application/json" }),
    body: (p) => JSON.stringify({
      model: "command-r-08-2024", temperature: p.temperature ?? 0.9, max_tokens: p.maxTokens ?? 900,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
    }),
    estrai: (j) => j.message?.content?.map?.((c) => c.text).join("") || j.text,
  },
  {
    nome: "ollama", key: () => ENV.OLLAMA_ENDPOINT ? "local" : null,
    url: () => (ENV.OLLAMA_ENDPOINT || "http://localhost:11434") + "/api/chat",
    headers: () => ({ "Content-Type": "application/json" }),
    body: (p) => JSON.stringify({
      model: ENV.OLLAMA_MODEL || "llama3.2", stream: false, format: "json",
      options: { temperature: p.temperature ?? 0.9 },
      messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
    }),
    estrai: (j) => j.message?.content,
  },
];

// Agent permissivo usato SOLO come retry quando la catena di certificati non è verificabile
// (tipico con antivirus/proxy aziendali che intercettano il TLS). Si può disattivare del tutto
// mettendo LLM_INSECURE_TLS=0 nel .env: in quel caso, se il MITM c'è, l'AI resta offline.
const agentPermissivo = new https.Agent({ rejectUnauthorized: false });
const CERT_ERR = /certificate|CERT_|self.signed|unable to verify/i;

function richiesta(urlStr, opts, body, timeoutMs = 20000, insecure = false) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request({
      hostname: u.hostname, port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search, method: "POST", headers: opts.headers,
      ...(insecure && u.protocol === "https:" ? { agent: agentPermissivo } : {}),
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error("timeout")); });
    req.end(body);
  });
}

// Esegue la richiesta; se fallisce per certificato non verificabile, riprova una sola volta
// accettando la catena (ambiente locale con TLS intercettato).
async function richiestaConFallback(url, opts, body) {
  try {
    return await richiesta(url, opts, body);
  } catch (e) {
    if (CERT_ERR.test(e.message) && ENV.LLM_INSECURE_TLS !== "0") {
      if (!richiestaConFallback._avvisato) {
        richiestaConFallback._avvisato = true;
        console.warn("[LLM] TLS intercettato da un proxy locale: uso il fallback (LLM_INSECURE_TLS=0 per disattivarlo).");
      }
      return await richiesta(url, opts, body, 20000, true);
    }
    throw e;
  }
}

// Prova i provider in cascata. Ritorna { testo, provider } o lancia se falliscono tutti.
async function chiediLLM(payload) {
  const errori = [];
  const soloProvider = payload.provider; // opzionale: forza un provider
  for (const p of PROVIDERS) {
    if (soloProvider && p.nome !== soloProvider) continue;
    const k = p.key();
    if (!k) { errori.push(`${p.nome}: nessuna chiave`); continue; }
    try {
      const url = typeof p.url === "function" ? p.url(k) : p.url;
      const r = await richiestaConFallback(url, { headers: p.headers(k) }, p.body(payload));
      if (r.status < 200 || r.status >= 300) { errori.push(`${p.nome}: HTTP ${r.status}`); continue; }
      const j = JSON.parse(r.data);
      const testo = p.estrai(j);
      if (!testo) { errori.push(`${p.nome}: risposta vuota`); continue; }
      return { testo, provider: p.nome };
    } catch (e) {
      errori.push(`${p.nome}: ${e.message}`);
    }
  }
  const err = new Error("tutti i provider hanno fallito");
  err.dettagli = errori;
  throw err;
}

http.createServer((req, res) => {
  // ---- API: proxy LLM ----
  if (req.url.startsWith("/api/llm")) {
    if (req.url === "/api/llm/status") {
      const disponibili = PROVIDERS.filter((p) => !!p.key()).map((p) => p.nome);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ disponibili }));
    }
    if (req.method !== "POST") { res.writeHead(405); return res.end("Method not allowed"); }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const out = await chiediLLM(payload);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ errore: e.message, dettagli: e.dettagli || [] }));
      }
    });
    return;
  }

  // ---- file statici ----
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";
  const file = path.normalize(path.join(ROOT, url));
  // Il separatore in fondo NON e' un dettaglio: senza, una cartella SORELLA il cui nome comincia
  // come quella del progetto passerebbe il controllo — «/../evolution-segreti/chiavi.txt» finisce
  // fuori dal progetto e `startsWith(ROOT)` dice comunque di si'. Verificato prima di correggere.
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  if (path.basename(file) === ".env") { res.writeHead(403); return res.end("Forbidden"); } // mai servire le chiavi
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log(`unwritten on http://localhost:${PORT}`));
