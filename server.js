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

// Scraper Pelisflix (ejemplo)
async function scrapePelisflix(siteId) {
  const url = `https://pelisflix200.cc/ver/${siteId}`;
  console.log("Scraping Pelisflix URL:", url);
  const res = await fetch(url, { timeout: 15000 }).catch(err => {
    console.error("Fetch error Pelisflix:", err && err.message);
    return null;
  });
  if (!res) return null;
  const html = await res.text();
  console.log("Pelisflix HTML length:", html.length);
  const $ = cheerio.load(html);
  const iframe = $("iframe").attr("src") || $("video source").attr("src") || null;
  return iframe;
}

// Scraper PelisHD24 (ejemplo)
async function scrapePelisHD24(siteId) {
  const url = `https://pelishd24.com/pelicula/${siteId}`;
  console.log("Scraping PelisHD24 URL:", url);
  const res = await fetch(url, { timeout: 15000 }).catch(err => {
    console.error("Fetch error PelisHD24:", err && err.message);
    return null;
  });
  if (!res) return null;
  const html = await res.text();
  console.log("PelisHD24 HTML length:", html.length);
  const $ = cheerio.load(html);
  const iframe = $("iframe").attr("src") || $("video source").attr("src") || null;
  return iframe;
}

// Catálogo mínimo para que Stremio descubra items
app.get("/catalog/:type/:id", async (req, res) => {
  // type: movie o series, id: página o categoría
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

// Stream handler que entiende ids del catálogo y otros formatos
app.get("/stream/:id", async (req, res) => {
  const id = req.params.id; // ejemplo: "nuvio:pelisflix:12345" o "12345"
  try {
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
      // Intento directo con el id como siteId en Pelisflix
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
