const fetch = require('node-fetch');

const BOT_TOKEN = '8200856265:AAHR8Oxe6-7101i8tx7NxlD9eOxWr3tKxns';

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { channel, messageId, type } = JSON.parse(event.body);

    if (!channel || !messageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing channel or messageId' }),
      };
    }

    // Build chat ID
    let chatId;
    if (type === 'username') {
      chatId = `@${channel}`;
    } else {
      chatId = `-100${channel}`;
    }

    // Get message from Telegram
    const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChat`;
    
    // First, try to get the chat info
    const chatResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId }),
    });

    if (!chatResponse.ok) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'بۆتەکە ناتوانێت کەناڵەکە ببینێت. دڵنیابەرەوە کە بۆتەکە ئەندامی کەناڵەکەیە.' 
        }),
      };
    }

    // Now try to get the specific message
    const messageUrl = `https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`;
    const messageResponse = await fetch(messageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        from_chat_id: chatId,
        message_id: parseInt(messageId),
      }),
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'ناتوانرێت ڤیدیۆکە بهێنرێت. دڵنیابەرەوە کە بۆتەکە ڕێگەی پێدراوە.' 
        }),
      };
    }

    const messageData = await messageResponse.json();

    // Check if message has video
    if (!messageData.result || !messageData.result.video) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'هیچ ڤیدیۆیەک لەم پەیامەدا نەدۆزرایەوە' }),
      };
    }

    const video = messageData.result.video;
    const fileId = video.file_id;

    // Get file path
    const filePathUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;
    const filePathResponse = await fetch(filePathUrl);
    const filePathData = await filePathResponse.json();

    if (!filePathData.ok) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'کێشەیەک هەیە لە وەرگرتنی ڤیدیۆکە' }),
      };
    }

    const filePath = filePathData.result.file_path;
    const videoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        videoUrl,
        fileSize: video.file_size,
        duration: video.duration,
        width: video.width,
        height: video.height,
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'کێشەیەکی سێرڤەر هەیە',
        details: error.message 
      }),
    };
  }
};
