// Import necessary modules
const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const psl = require("psl");

// Initialize express app
const app = express();
const PORT = 8080;

// Middleware setup
app.use(express.static("public"));
app.use(express.json());

// Global progress tracker
const progress = { completed: 0, total: 0 };

// Lightspeed category numbers and paths setup
const lightspeedCategoryNumbers = [
  6, 9, 10, 14, 15, 18, 20, 29, 30, 36, 37, 40, 41, 43, 44, 45, 46, 47, 48, 49, 50, 51, 57, 58, 59, 69, 73, 75, 76, 77,
  79, 83, 84, 85, 99, 129, 131, 132, 139, 140, 900,
];
const lightspeedCategoriesPath = path.join(__dirname, "./public/lightspeed-categories.json");
const lightspeedCategories = JSON.parse(fs.readFileSync(lightspeedCategoriesPath, "utf8"));

// Fetch categorization from Lightspeed API
async function fetchCategorization(hostname) {
  try {
    const response = await fetch("https://production-archive-proxy-api.lightspeedsystems.com/archiveproxy", {
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        authority: "production-archive-proxy-api.lightspeedsystems.com",
        "content-type": "application/json",
        origin: "https://archive.lightspeedsystems.com",
        "user-agent": "Mozilla/5.0",
        "x-api-key": "onEkoztnFpTi3VG7XQEq6skQWN3aFm3h",
      },
      body: `{"query":"\\nquery getDeviceCategorization($itemA: CustomHostLookupInput!, $itemB: CustomHostLookupInput!){\\n  a: custom_HostLookup(item: $itemA) { cat}\\n  b: custom_HostLookup(item: $itemB) { cat   \\n  }\\n}","variables":{"itemA":{"hostname":"${hostname}"}, "itemB":{"hostname":"${hostname}"}}}`,
    });

    if (!response.ok) {
      console.error("Network response was not ok:", response.statusText);
      return { categories: [], status: "Unknown", categoryName: "Unknown" };
    }

    const body = await response.json();
    const categories = [body.data.a.cat, body.data.b.cat];

    const isUnblocked = categories.some((cat) => lightspeedCategoryNumbers.includes(cat));

    let categoryName = "Unknown";
    for (const cat of categories) {
      if (lightspeedCategories[cat]) {
        categoryName = lightspeedCategories[cat];
        break;
      }
    }

    return {
      categories,
      status: isUnblocked ? "Unblocked" : "Blocked",
      categoryName,
    };
  } catch (error) {
    console.error("Fetch error:", error);
    return { categories: [], status: "Error", categoryName: "Error" };
  }
}

// POST endpoint to check links
app.post("/check-links", async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Invalid input: 'urls' must be a non-empty array." });
  }

  progress.completed = 0;
  progress.total = urls.length;

  const domainResults = [];

  for (let fullUrl of urls) {
    let hostname, rootDomain;
    try {
      console.log(`Processing URL: ${fullUrl}`);
      if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
        fullUrl = `http://${fullUrl}`; // Make sure the URL has a protocol
      }

      hostname = new URL(fullUrl).hostname;
      const parsed = psl.parse(hostname);
      rootDomain = parsed.domain;

      if (!rootDomain) {
        console.warn(`Could not extract root domain from ${hostname}`);
        continue;
      }
    } catch (err) {
      console.error(`Invalid URL skipped: ${fullUrl}`, err);
      continue;
    }

    console.log(`Checking root domain: ${rootDomain} (from ${fullUrl})`);

    const domainResult = {
      url: fullUrl,
      hostname,
      rootDomain,
      lightspeed: {
        status: "Not Checked",
        category: "Not Checked",
      },
    };

    try {
      const lightspeedData = await fetchCategorization(rootDomain);
      domainResult.lightspeed = {
        status: lightspeedData.status,
        category: lightspeedData.categoryName,
      };
    } catch (err) {
      console.error(`Lightspeed error for ${rootDomain}:', err)'
