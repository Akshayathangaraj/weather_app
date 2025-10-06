// server.js - Express server for Weather App (frontend + proxy)
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const KEY = process.env.OPENWEATHER_API_KEY;

if (!KEY) console.error('Warning: OPENWEATHER_API_KEY not set in env');

// Allow CORS for safety
app.use(cors());

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// API route for current weather
app.get('/api/weather', async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    let url = '';
    if (city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        city
      )}&appid=${KEY}&units=metric`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric`;
    } else {
      return res.status(400).json({ error: 'city or lat+lon required' });
    }

    const r = await fetch(url);
    const j = await r.json();
    res.json(j);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API route for forecast
app.get('/api/forecast', async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    let url = '';
    if (city) {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        city
      )}&appid=${KEY}&units=metric`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${KEY}&units=metric`;
    } else {
      return res.status(400).json({ error: 'city or lat+lon required' });
    }

    const r = await fetch(url);
    const j = await r.json();
    res.json(j);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Catch-all route: send index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
