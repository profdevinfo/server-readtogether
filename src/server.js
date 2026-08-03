const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
require('./config/firebase');

const apiRoutes = require('./routes/api');

const app = express();

// استخدام البرمجيات الوسيطة للحماية والأمان
app.use(helmet());
app.use(cors({ origin: '*' })); // يمكن تخصيصه لاحقاً لنطاق الاستضافة الفعلي
app.use(express.json());

// ربط المسارات
app.use('/api/v1', apiRoutes);

// فحص صحة الخادم Health Check
app.get('/', (req, res) => {
  res.send('Let\'s Read Backend API is running successfully.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);

  // إبقاء الخادم نشطاً على Render free tier (منع الـ cold start)
  if (process.env.NODE_ENV === 'production') {
    require('./keepAlive').start();
  }
});