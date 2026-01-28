/**
 * API Server للتكامل مع FleetifyApp
 */
import express from 'express';
import cors from 'cors';
import { automateTaqadiLawsuit } from './src/index.js';
import { logger } from './src/utils/logger.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/**
 * Endpoint لرفع دعوى
 */
app.post('/api/taqadi/submit', async (req, res) => {
  try {
    const { contractId, prepareUrl, downloadDir } = req.body;
    
    if (!contractId) {
      return res.status(400).json({
        success: false,
        error: 'contractId مطلوب',
      });
    }
    
    logger.info(`📥 طلب جديد: رفع دعوى للعقد ${contractId}`);
    
    // تشغيل الأتمتة
    const result = await automateTaqadiLawsuit({
      contractId,
      prepareUrl,
      downloadDir,
    });
    
    res.json({
      success: true,
      caseNumber: result.caseNumber,
      message: 'تم رفع الدعوى بنجاح',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('فشل رفع الدعوى', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'taqadi-automation',
    timestamp: new Date().toISOString(),
  });
});

/**
 * تشغيل السيرفر
 */
app.listen(PORT, () => {
  console.log('🚀 Taqadi Automation API running on port', PORT);
  console.log(`📍 http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST http://localhost:${PORT}/api/taqadi/submit`);
  console.log(`  GET  http://localhost:${PORT}/health`);
});
