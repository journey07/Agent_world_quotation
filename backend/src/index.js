import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import quoteRoutes from './routes/quote.js';
import { startHeartbeat } from './services/statsService.js';


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS 설정: 개발 환경과 프로덕션 환경 모두 지원
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5174',
      'http://localhost:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5173',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // origin이 없으면 (같은 도메인 요청 등) 허용
      if (!origin) return callback(null, true);
      
      // 허용된 origin인지 확인
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' })); // Increase limit for large base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/quote', quoteRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});



// Start server
app.listen(PORT, () => {
  console.log(`🚀 Locker Quote API running on http://localhost:${PORT}`);
  startHeartbeat(PORT);
});
