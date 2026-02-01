import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import quoteRoutes from './routes/quote.js';
import authRoutes from './routes/auth.js';
import inquiryRoutes from './routes/inquiry.js';
import { startHeartbeat } from './services/statsService.js';
import { extractUserMiddleware } from './utils/userMiddleware.js';


const app = express();
const PORT = process.env.PORT || 3001;

export default app;


// Middleware
// CORS 설정: 개발 환경과 프로덕션 환경 모두 지원
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
    'https://agent-world-quotation.vercel.app',
    'https://agent-world-quotation-frontend.vercel.app',
    'https://wl-agent1.supersquad.kr',
    'http://localhost:5174',
    'http://localhost:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5173',
  ];

// 개발 환경에서는 모든 localhost 포트 허용
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      // origin이 없으면 (같은 도메인 요청 등) 허용
      if (!origin) return callback(null, true);

      // 개발 환경에서는 localhost 모두 허용
      if (isDevelopment && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        return callback(null, true);
      }

      // origin 정규화 (슬래시 제거)
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

      // 허용된 origin인지 확인 (정규화된 origin과 비교)
      const normalizedAllowedOrigins = allowedOrigins.map(o => o.endsWith('/') ? o.slice(0, -1) : o);

      if (normalizedAllowedOrigins.includes(normalizedOrigin) || normalizedAllowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${normalizedOrigin}. Allowed origins:`, normalizedAllowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-name', 'x-user-name-encoded'],
  })
);
app.use(express.json({ limit: '50mb' })); // Increase limit for large base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 사용자 정보 추출 미들웨어 (모든 라우트 전에 적용)
app.use(extractUserMiddleware);

// Request Logger Middleware
app.use((req, res, next) => {
  const userAgent = req.get('user-agent') || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const isUptimeRobot = userAgent.includes('UptimeRobot') || userAgent.includes('uptimerobot');

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | IP: ${ip} | UA: ${userAgent.substring(0, 50)}${isUptimeRobot ? ' 🤖 UPTIMEROBOT' : ''}`);
  next();
});

// Routes
app.use('/api/quote', quoteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/inquiry', inquiryRoutes);
app.use('/inquiries', inquiryRoutes); // 프론트엔드 호환성

// For backward compatibility with top-level paths (e.g., /calculate instead of /api/quote/calculate)
app.use('/', quoteRoutes);


// Health check - GET and HEAD methods supported
const healthCheckHandler = (req, res) => {
  const userAgent = req.get('user-agent') || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const isUptimeRobot = userAgent.includes('UptimeRobot') || userAgent.includes('uptimerobot');

  if (isUptimeRobot) {
    console.log(`✅ UptimeRobot ping received (${req.method}) from ${ip} at ${new Date().toISOString()}`);
  }

  const responseData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    source: isUptimeRobot ? 'uptimerobot' : 'other'
  };

  // HEAD 요청은 body 없이 상태 코드만 반환
  if (req.method === 'HEAD') {
    res.status(200).end();
  } else {
    res.json(responseData);
  }
};

app.get('/health', healthCheckHandler);
app.head('/health', healthCheckHandler);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});



// Start server
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Locker Quote API running on http://localhost:${PORT}`);
    startHeartbeat(PORT);
  });
}

