require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { generateResponse } = require('./chatbot');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50 // Limit to 50 requests per IP
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const userInput = req.body.message?.trim();
  if (!userInput) {
    return res.status(400).json({ response: 'Vui lòng nhập tin nhắn! 😊' });
  }
  const startTime = Date.now();
  try {
    const response = await generateResponse(userInput);
    console.log(`User input: '${userInput}', Response: '${response}', Processing time: ${(Date.now() - startTime) / 1000}s`);
    res.json({ response });
  } catch (error) {
    console.error(`Error: ${error}`);
    res.status(500).json({ response: 'Xin lỗi, hệ thống đang gặp lỗi. Vui lòng thử lại sau! 😔' });
  }
});

// Start server
const port = process.env.PORT || 8000;
app.listen(port, '0.0.0.0', () => {
  console.log(`API running on port ${port}`);
});