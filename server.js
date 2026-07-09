import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";

const app = express();

// CORS básico
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Healthcheck
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Raíz
app.get("/", (req, res) => {
  res.send("Nuvio-ES funcionando en Railway.");
});

// Manifest para Stremio
app.get("/manifest.json", (req, res) => {
  res.json({
    id: "nuvio.es",
    version: "1.0.0",
    name: "Nuvio Castellano España",
    description: "Addon Nuvio con scrapers españoles.",
    types: ["movie", "series"],
    resources: ["stream", "catalog"],
    catalogs: [
      {
        id: "nuvio.es.catalog",
        name: "Castellano España",
        type: "movie",
        extra: ["search"]
      }
    ]
  });
});

// Addon info alternativa
app.get("/addon.json", (req, res) => {
  res.json({
    id: "nuvio.es",
    version: "1.0.0",
    name: "Nuvio Castellano España",
    resources: ["stream", "catalog"],
    types: ["movie", "series"],
    catalogs: [
      {
        id: "nuvio.es.catalog",
        name: "Castellano España",
        type: "movie",
        extra: ["search"]
      }
    ],
    endpoint: `${req.protocol}://${req.get("host")}`
  });
});

// Scraper Pelisflix con headers y logs
async function scrapePelisflix(siteId) {
  const url = `https://pelisflix200.cc/ver/${siteId}`;
  console.log("Scraping Pelisflix URL:", url);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Referer": "https://pelisflix200.cc/"
    },
    timeout: 15000
  }).catch(err => {
    console.error("Fetch error Pelisflix:", err && err.message);
    return null;
  });
  if (!res) return null;
  const html = await res.text();
  console.log("Pelisflix HTML length:", html.length);
  console.log("Pelisflix HTML head:", html.slice(0, 1000));
  const $ = cheerio.load(html);

  let iframe = $("iframe").attr("src") || $("div.player iframe").attr("src") || $("video source").attr("src") || null;

  if (!iframe) {
    const dataSrc = $("[data-src]").attr("data-src");
    if (dataSrc) iframe = dataSrc;
  }

  if (iframe && iframe.startsWith("//")) iframe = "https:" + iframe;
  if (iframe && iframe.startsWith("/")) iframe = "https://pelisflix200.cc" + iframe;

  console.log("Pelisflix extracted iframe:", iframe);
  return iframe;
}

// Scraper PelisHD24 con headers y logs
async function scrapePelisHD24(siteId) {
  const url = `https://pelishd24.com/pelicula/${siteId}`;
  console.log("Scraping PelisHD24 URL:", url);
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Referer": "https://pelishd24.com/"
    },
    timeout: 15000
  }).catch(err => {
    console.error("Fetch error PelisHD24:", err && err.message);
    return null;
  });
  if (!res) return null;
  const html = await res.text();
  console.log("PelisHD24 HTML length:", html.length);
  console.log("PelisHD24 HTML head:", html.slice(0, 1000));
  const $ = cheerio.load(html);

  let iframe = $("iframe").attr("src") || $("div.player iframe").attr("src") || $("video source").attr("src") || null;

  if (!iframe) {
    const dataSrc = $("[data-src]").attr("data-src");
    if (dataSrc) iframe = dataSrc;
  }

  if (iframe && iframe.startsWith("//")) iframe = "https:" + iframe;
  if (iframe && iframe.startsWith("/")) iframe = "https://pelishd24.com" + iframe;

  console.log("PelisHD24 extracted iframe:", iframe);
  return iframe;
}

// Catálogo mínimo para que Stremio descubra items
app.get("/catalog/:type/:id", async (req, res) => {
  const items = [
    {
      id: "nuvio:pelisflix:12345",
      type: "movie",
      name: "Película de prueba Castellano",
      poster: "https://via.placeholder.com/400x600.png?text=Pel%C3%ADcula+Prueba",
      year: 2023,
      imdb_id: null,
      tmdb: null
    }
  ];

  return res.json({
    metas: items
  });
});

// Stream handler con stream de prueba y scrapers reales
app.get("/stream/:id", async (req, res) => {
  const id = req.params.id;
  try {
    if (id === "nuvio:pelisflix:12345") {
      return res.json({
        streams: [
          {
            name: "Prueba Nuvio - BigBuckBunny (MP4)",
            url: "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4",
            info: { quality: "720p", language: "es" }
          }
        ]
      });
    }

    const parts = id.split(":");
    let streams = [];

    if (parts.length === 3 && parts[0] === "nuvio") {
      const source = parts[1];
      const siteId = parts[2];

      if (source === "pelisflix") {
        const url = await scrapePelisflix(siteId).catch(() => null);
        if (url) streams.push({ name: "Pelisflix (Castellano)", url });
      } else if (source === "pelishd24") {
        const url = await scrapePelisHD24(siteId).catch(() => null);
        if (url) streams.push({ name: "PelisHD24 (Castellano)", url });
      }
    } else {
      const url = await scrapePelisflix(id).catch(() => null);
      if (url) streams.push({ name: "Pelisflix (Castellano)", url });
    }

    return res.json({ streams });
  } catch (err) {
    console.error("Stream handler error:", err);
    return res.status(500).json({ streams: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor Nuvio-ES escuchando en puerto ${PORT}`);
});

app.get("/stream/:id", async (req, res) => {
  if (req.params.id === "nuvio:pelisflix:12345") {
    return res.json({
      streams: [
        {
          name: "Prueba Nuvio - Test MP4",
          url: "$NEW_URL",
          info: { quality: "720p", language: "es" }
        }
      ]
    });
  }
  return res.json({ streams: [] });
});
