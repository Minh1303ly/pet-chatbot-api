const fs = require('fs').promises;
const { normalize } = require('./utils');

// Load training data
let trainingData = { intents: [], products: [] };
async function loadTrainingData() {
  try {
    const data = await fs.readFile('chatbot_training_data.json', 'utf-8');
    trainingData = JSON.parse(data);
    if (!Array.isArray(trainingData.intents)) {
      throw new Error("JSON file must contain an 'intents' list");
    }
    console.log('JSON file loaded successfully.');
  } catch (error) {
    console.error(`Error loading JSON: ${error}`);
  }
}
loadTrainingData();

// Context history
const contextHistory = [];
const MAX_CONTEXT_LENGTH = 3;

// Intent detection
function detectIntent(userInput, context = []) {
  const userInputNormalized = normalize(userInput.toLowerCase().trim());
  const contextText = context.join(' ').trim();
  const combinedInput = `${contextText} ${userInputNormalized}`.trim();

  const productKeywords = ['có', 'tìm', 'đâu', 'có không'];
  const clothingKeywords = ['áo', 'váy', 'quần', 'yếm', 'áo khoác'];

  if (productKeywords.some(k => combinedInput.includes(k)) && clothingKeywords.some(k => combinedInput.includes(k))) {
    const intent = trainingData.intents.find(i => i.intent === 'inquire_product');
    if (intent) {
      console.log('Matched intent: inquire_product');
      const { priceMax, color, category, petType, size, material } = extractQueryInfo(userInput);
      let response = intent.responses[Math.floor(Math.random() * intent.responses.length)];
      response = response
        .replace('{clothing_type}', category || 'quần áo')
        .replace('{pet_type}', petType || 'thú cưng')
        .replace('{size}', size || 'phù hợp')
        .replace('{color}', color || 'đẹp');
      return response;
    }
  }

  for (const intent of trainingData.intents) {
    if (intent.intent === 'inquire_product') continue;
    for (const pattern of intent.examples || []) {
      const patternNormalized = normalize(pattern.toLowerCase().trim());
      const patternKeywords = new Set(patternNormalized.split(' '));
      if (patternKeywords.some(k => combinedInput.includes(k)) &&
          !(productKeywords.some(k => combinedInput.includes(k)) && clothingKeywords.some(k => combinedInput.includes(k)))) {
        console.log(`Matched intent: ${intent.intent} with pattern: '${pattern}'`);
        const { priceMax, color, category, petType, size, material, location } = extractQueryInfo(userInput);
        let response = intent.responses[Math.floor(Math.random() * intent.responses.length)];
        response = response
          .replace('{clothing_type}', category || 'quần áo')
          .replace('{pet_type}', petType || 'thú cưng')
          .replace('{size}', size || 'phù hợp')
          .replace('{color}', color || 'đẹp')
          .replace('{location}', location || 'bạn')
          .replace('{age}', 'phù hợp')
          .replace('{material}', material || 'chất liệu tốt')
          .replace('{price}', priceMax || 200000)
          .replace('{season}', 'phù hợp');
        return response;
      }
    }
  }
  console.log(`No intent matched for input: '${userInputNormalized}'`);
  return null;
}

// Product recommendation
function recommendProducts(priceMax, color, category, petType, size, material) {
  const products = trainingData.products || [];
  return products.filter(product => {
    let match = true;
    if (priceMax && product.price > priceMax) match = false;
    if (color && product.color.toLowerCase() !== color.toLowerCase()) match = false;
    if (category && !product.name.toLowerCase().includes(category.toLowerCase())) match = false;
    if (petType && product.pet_type.toLowerCase() !== petType.toLowerCase()) match = false;
    if (size && product.size.toLowerCase() !== size.toLowerCase()) match = false;
    if (material && product.material.toLowerCase() !== material.toLowerCase()) match = false;
    return match;
  });
}

// Extract query info
function extractQueryInfo(userInput) {
  const userInputLower = normalize(userInput.toLowerCase().trim());
  let priceMax = null, color = null, category = null, petType = null, size = null, material = null, location = null;

  if (userInputLower.includes('dưới')) {
    const match = userInputLower.match(/dưới\s*(\d+)\s*k/);
    if (match) priceMax = parseInt(match[1]) * 1000;
  }

  if (userInputLower.includes('màu')) {
    const colorWords = userInputLower.split('màu')[1]?.trim().split(' ');
    if (colorWords) color = colorWords[0];
  }

  if (['áo', 'váy', 'quần', 'yếm', 'áo khoác'].some(k => userInputLower.includes(k))) {
    category = ['áo khoác', 'áo', 'váy', 'quần', 'yếm'].find(k => userInputLower.includes(k)) || 'quần áo';
  }

  if (userInputLower.includes('chó')) petType = 'chó';
  else if (userInputLower.includes('mèo')) petType = 'mèo';

  if (['size s', ' s '].some(k => userInputLower.includes(k))) size = 'S';
  else if (['size m', ' m '].some(k => userInputLower.includes(k))) size = 'M';
  else if (['size l', ' l '].some(k => userInputLower.includes(k))) size = 'L';
  else if (['size xl', ' xl '].some(k => userInputLower.includes(k))) size = 'XL';

  if (userInputLower.includes('cotton')) material = 'cotton';
  else if (userInputLower.includes('voan')) material = 'voan';
  else if (userInputLower.includes('jeans')) material = 'jeans';
  else if (userInputLower.includes('len')) material = 'len';
  else if (userInputLower.includes('polyester')) material = 'polyester';

  if (userInputLower.includes('hà nội')) location = 'Hà Nội';
  else if (['tp.hcm', 'sài gòn'].some(k => userInputLower.includes(k))) location = 'TP.HCM';
  else if (userInputLower.includes('đà nẵng')) location = 'Đà Nẵng';
  else if (userInputLower.includes('cần thơ')) location = 'Cần Thơ';

  return { priceMax, color, category, petType, size, material, location };
}

// Response generation
async function generateResponse(userInput) {
  const userInputNormalized = normalize(userInput.trim());
  const userInputLower = userInputNormalized.toLowerCase();

  // Update context
  contextHistory.push(userInputNormalized);
  if (contextHistory.length > MAX_CONTEXT_LENGTH) contextHistory.shift();

  // Handle vague or short inputs
  if (userInputNormalized.length <= 3 || ['có', 'ok', 'ừ', 'vâng'].includes(userInputLower)) {
    return 'Dạ, bạn muốn tìm sản phẩm nào cho bé nhà mình nhỉ? Mình có áo, váy, quần cho chó và mèo, giá từ 150k-300k! 😊';
  }

  // Intent matching
  const intentResponse = detectIntent(userInputNormalized, contextHistory);
  if (intentResponse) return intentResponse;

  // Fallback with keyword-based handling
  const { priceMax, color, category, petType, size, material, location } = extractQueryInfo(userInputNormalized);

  if (['có', 'tìm', 'đâu', 'có không'].some(k => userInputLower.includes(k)) &&
      ['áo', 'váy', 'quần', 'yếm', 'áo khoác'].some(k => userInputLower.includes(k))) {
    const products = recommendProducts(priceMax, color, category, petType, size, material);
    if (products.length) {
      const productList = products.map(p => `${p.name} (Giá: ${p.price} VNĐ, Màu: ${p.color})`).join(', ');
      return `Dạ, shop có ${productList}. Bạn muốn mình gửi hình chi tiết hay chốt đơn luôn không? 😊`;
    } else {
      return `Xin lỗi bạn nha, hiện tại shop chưa có ${category || 'sản phẩm'} ${petType || ''} ${color || ''} ${size || ''}. Bạn thử tìm mẫu khác không? 😊`;
    }
  }

  if (['giặt', 'bảo quản', 'phơi'].some(k => userInputLower.includes(k))) {
    const intent = trainingData.intents.find(i => i.intent === 'ask_care_instructions');
    if (intent) {
      const response = intent.responses[Math.floor(Math.random() * intent.responses.length)];
      return response.replace('{clothing_type}', category || 'quần áo') || 'Nên giặt tay với nước mát, tránh chất tẩy mạnh và phơi nơi thoáng mát nhé! 😊';
    }
  }

  if (['giao hàng', 'bao lâu', 'phí ship', 'khi nào tới'].some(k => userInputLower.includes(k))) {
    const intent = trainingData.intents.find(i => i.intent === 'ask_delivery_time');
    if (intent) {
      const response = intent.responses[Math.floor(Math.random() * intent.responses.length)];
      return response.replace('{location}', location || 'bạn') || `Bạn ở ${location || 'khu vực của bạn'} thì hàng sẽ tới trong 1-2 ngày, phí ship 30k, miễn phí cho đơn từ 500k nha! 😊 (Hôm nay là ${new Date().toLocaleString('vi-VN')})`;
    }
  }

  const products = recommendProducts(priceMax, color, category, petType, size, material);
  if (products.length) {
    const productList = products.map(p => `${p.name} (Giá: ${p.price} VNĐ, Màu: ${p.color})`).join(', ');
    return `Dạ, shop có ${productList}. Bạn muốn mình tư vấn thêm về mẫu nào không? 😊`;
  } else {
    return 'Xin lỗi bạn nha, hiện tại shop chưa có sản phẩm phù hợp. Bạn thử tìm màu hoặc size khác xem, mình sẵn sàng tư vấn thêm! 😊';
  }
}

module.exports = { generateResponse };