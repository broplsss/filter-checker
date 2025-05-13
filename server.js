// Your other imports
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const psl = require('psl');

const app = express();
const PORT = process.env.PORT || 8080;  // Use environment variable for dynamic port

// Middleware
app.use(express.static('public'));
app.use(express.json());

// POST route at /check-links
app.post("/check-links", async (req, res) => {
  const { urls } = req.body;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "'urls' must be a non-empty array." });
  }

  // Logic to handle URLs
  const results = urls.map(url => ({
    url,
    status: "Unblocked",  // Add any additional logic here
  }));

  res.json({ domains: results });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
