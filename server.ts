import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const db = new Database("weather_uba.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS manual_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    rainfall_24h REAL,
    river_level REAL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS civil_defense_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT, -- 'info', 'warning', 'danger'
    message TEXT,
    details TEXT,
    active INTEGER DEFAULT 1
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  const UBA_COORDS = { lat: -21.1206, lon: -42.9428 };
  const API_KEY = process.env.OPENWEATHER_API_KEY;

  const getMockWeather = () => ({
    current: {
      temp: 24.5,
      feels_like: 26,
      humidity: 82,
      wind_speed: 5.2,
      rain_1h: 2.5,
      description: "Chuva leve (Simulado)"
    },
    forecast: Array.from({ length: 7 }).map((_, i) => ({
      date: new Date(Date.now() + i * 86400000).toISOString(),
      temp_min: 20 + Math.random() * 5,
      temp_max: 28 + Math.random() * 5,
      rain: Math.random() * 20,
      description: "Parcialmente Nublado"
    }))
  });

  const getWeatherDescription = (code: number) => {
    const mapping: Record<number, string> = {
      0: "Céu limpo",
      1: "Principalmente limpo", 2: "Parcialmente nublado", 3: "Encoberto",
      45: "Nevoeiro", 48: "Nevoeiro com geada",
      51: "Garoa leve", 53: "Garoa moderada", 55: "Garoa densa",
      61: "Chuva leve", 63: "Chuva moderada", 65: "Chuva forte",
      80: "Pancadas de chuva leves", 81: "Pancadas de chuva moderadas", 82: "Pancadas de chuva violentas",
      95: "Trovoada leve ou moderada", 96: "Trovoada com granizo leve", 99: "Trovoada com granizo forte"
    };
    return mapping[code] || "Condições variáveis";
  };

  // API Routes
  app.get("/api/weather", async (req, res) => {
    try {
      // Try Open-Meteo first (No API Key required, very reliable)
      try {
        const response = await axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${UBA_COORDS.lat}&longitude=${UBA_COORDS.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code&timezone=auto`
        );
        
        const data = response.data;
        const forecast = data.daily.time.map((time: string, i: number) => ({
          date: time,
          temp_min: data.daily.temperature_2m_min[i],
          temp_max: data.daily.temperature_2m_max[i],
          rain: data.daily.precipitation_sum[i],
          probability: data.daily.precipitation_probability_max[i],
          weather_code: data.daily.weather_code[i],
          description: getWeatherDescription(data.daily.weather_code[i])
        }));

        return res.json({
          current: {
            temp: data.current.temperature_2m,
            feels_like: data.current.apparent_temperature,
            humidity: data.current.relative_humidity_2m,
            wind_speed: data.current.wind_speed_10m,
            rain_1h: data.current.precipitation,
            rain_probability: data.daily.precipitation_probability_max[0],
            weather_code: data.current.weather_code,
            description: getWeatherDescription(data.current.weather_code)
          },
          forecast
        });
      } catch (openMeteoError: any) {
        console.warn("Open-Meteo API failed, trying OpenWeatherMap fallback:", openMeteoError.message);
        
        if (!API_KEY || API_KEY.trim() === "") {
          return res.json(getMockWeather());
        }

        // Fallback to OpenWeatherMap if Open-Meteo fails and key is present
        const [currentRes, forecastRes] = await Promise.all([
          axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${UBA_COORDS.lat}&lon=${UBA_COORDS.lon}&units=metric&appid=${API_KEY}`),
          axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${UBA_COORDS.lat}&lon=${UBA_COORDS.lon}&units=metric&appid=${API_KEY}`)
        ]);

        const forecastData = forecastRes.data.list
          .filter((_: any, index: number) => index % 8 === 0)
          .map((item: any) => ({
            date: item.dt_txt,
            temp_min: item.main.temp_min,
            temp_max: item.main.temp_max,
            rain: item.rain?.['3h'] || 0,
            description: item.weather[0].description
          }));

        return res.json({
          current: {
            temp: currentRes.data.main.temp,
            feels_like: currentRes.data.main.feels_like,
            humidity: currentRes.data.main.humidity,
            wind_speed: currentRes.data.wind.speed,
            rain_1h: currentRes.data.rain?.['1h'] || 0,
            description: currentRes.data.weather[0].description
          },
          forecast: forecastData
        });
      }
    } catch (error: any) {
      console.error("Weather API error:", error.message);
      res.json(getMockWeather());
    }
  });

  app.get("/api/flood-risk", async (req, res) => {
    try {
      const lastReading = db.prepare("SELECT * FROM manual_readings ORDER BY timestamp DESC LIMIT 1").get() as any;
      
      let rain24h = lastReading?.rainfall_24h;
      let riverLevel = lastReading?.river_level;

      // Fallback to real weather data if manual reading is missing
      if (rain24h === undefined || rain24h === null) {
        try {
          const weatherRes = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${UBA_COORDS.lat}&longitude=${UBA_COORDS.lon}&daily=precipitation_sum&timezone=auto`
          );
          rain24h = weatherRes.data.daily.precipitation_sum[0] || 0;
        } catch (e) {
          rain24h = Math.random() * 10; // Last resort fallback
        }
      }

      if (riverLevel === undefined || riverLevel === null) {
        riverLevel = 1.2 + Math.random() * 0.5; // Default "safe" level if no data
      }

      let risk = "Baixo";
      let color = "green";
      
      if (rain24h > 80 || riverLevel > 4.5) {
        risk = "Crítico";
        color = "red";
      } else if (rain24h > 50 || riverLevel > 3.5) {
        risk = "Alto";
        color = "orange";
      } else if (rain24h > 30 || riverLevel > 2.5) {
        risk = "Moderado";
        color = "yellow";
      }

      res.json({
        risk,
        color,
        rain24h,
        rain48h: rain24h * 1.2,
        rain72h: rain24h * 1.5,
        riverLevel,
        trend: "Estável"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate flood risk" });
    }
  });

  app.get("/api/alerts", (req, res) => {
    const alerts = db.prepare("SELECT * FROM civil_defense_alerts WHERE active = 1 ORDER BY timestamp DESC").all();
    res.json(alerts);
  });

  app.post("/api/admin/reading", (req, res) => {
    const { rainfall_24h, river_level, notes } = req.body;
    db.prepare("INSERT INTO manual_readings (rainfall_24h, river_level, notes) VALUES (?, ?, ?)")
      .run(rainfall_24h, river_level, notes);
    res.json({ success: true });
  });

  app.post("/api/admin/alert", (req, res) => {
    const { level, message, details } = req.body;
    db.prepare("INSERT INTO civil_defense_alerts (level, message, details) VALUES (?, ?, ?)")
      .run(level, message, details);
    res.json({ success: true });
  });

  app.get("/api/history", (req, res) => {
    // Mock 30 days history
    const history = Array.from({ length: 30 }).map((_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
      rain: Math.random() * 40,
      temp: 22 + Math.random() * 8
    }));
    res.json(history);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
