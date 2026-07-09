import express from "express";
import fetch from "node-fetch";
import cheerio from "cheerio";

const app = express();

app.get("/", (req, res) => {
  res.send("Nuvio-ES funcionando en Railway.");
});

app.get("/manifest.json", (req, res) => {
  res.json({
    id: "nuvio.es",
    version: "1.0.0",
    name: "Nuvio Castellano España",
    description: "Addon Nuvio con scrapers españoles.",
    types: ["movie", "series"],
    resources: ["stream"],
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

app.get("/addon.json", (req, res) => {
  res.json({
    id: "nuvio.es",
    version: "1.0.0",
    name: "Nuvio Castellano España",
    resources: ["stream"],
    types: ["movie", "series"],
    catalogs: [
      {
        id: "nuvio.es.catalog",
        name: "Castellano España",
        type: "movie",
        extra: ["search"]
      }
    ],
    endpoint: `${req.protocol}://${req.get("host")}/stream`
  });
});

async function scrapePelisflix(id) {
  const url = `https://pelisflix200.cc/ver/${id}`;
  const html = await fetch(url).then(r => r.text());
  const $ = cheerio.load(html);
  return $("iframe").attr("src");
}

async function scrapePelisHD24(id) {
  const url = `https://pelishd24.com/pelicula/${id}`;
  const html = await fetch(url).then(r => r.text());
  const $ = cheerio.load(html);
  return $("iframe").attr("src");
}

app.get("/stream/:id", async (req, res) => {
  const id = req.params.id;

  const pelisflix = await scrapePelisflix(id).catch(() => null);
  const pelishd24 = await scrapePelisHD24(id).catch(() => null);

  const streams = [];

  if (pelisflix) {
    streams.push({
      name: "Pelisflix (Castellano)",
      url: pelisflix
    });
  }

  if (pelishd24) {
    streams.push({
      name: "PelisHD24 (Castellano)",
      url: pelishd24
    });
  }

  res.json({ streams });
});

app.listen(process.env.PORT || 3000);
