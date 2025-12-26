// Cloudflare Worker - بۆ هێنانی ڤیدیۆکانی تێلێگرام
const BOT_TOKEN = '8200856265:AAHR8Oxe6-7101i8tx7NxlD9eOxWr3tKxns';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  // Get video endpoint
  if (url.pathname === '/api/get-video' && request.method === 'POST') {
    try {
      const { channel, messageId } = await request.json();
      
      // Build chat ID
      const chatId = channel.startsWith('@') ? channel : `@${channel}`;
      
      // Get message
      const messageUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
      
      // Better approach: use getChat first
      const chatResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId })
      });
      
      if (!chatResponse.ok) {
        return jsonResponse({ error: 'بۆتەکە ناتوانێت کەناڵەکە ببینێت' }, 400);
      }

      // Try to copy message to get file
      const copyUrl = `https://api.telegram.org/bot${BOT_TOKEN}/copyMessage`;
      const copyResponse = await fetch(copyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          from_chat_id: chatId,
          message_id: parseInt(messageId)
        })
      });

      if (!copyResponse.ok) {
        return jsonResponse({ error: 'ناتوانرێت پەیامەکە بهێنرێتەوە' }, 400);
      }

      const data = await copyResponse.json();
      
      // Get video file
      if (data.result && data.result.video) {
        const fileId = data.result.video.file_id;
        const fileResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const fileData = await fileResponse.json();
        
        if (fileData.ok) {
          const videoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
          return jsonResponse({ videoUrl, success: true });
        }
      }

      return jsonResponse({ error: 'ڤیدیۆ نەدۆزرایەوە' }, 404);

    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // Proxy video files
  if (url.pathname.startsWith('/video/')) {
    const videoPath = url.pathname.replace('/video/', '');
    const telegramUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${videoPath}`;
    
    const response = await fetch(telegramUrl);
    return new Response(response.body, {
      headers: {
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
