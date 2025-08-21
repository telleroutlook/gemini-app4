// Cloudflare Worker - 代理Gemini API请求
// 部署到 https://your-domain.com/api/gemini/*

export default {
  async fetch(request, env, ctx) {
    // 只允许POST请求
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // 检查来源域名
    const origin = request.headers.get('Origin');
    const allowedOrigins = [
      'https://gemini.xuexiao.eu.org',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    if (!allowedOrigins.includes(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      // 获取请求体
      const body = await request.text();
      
      // 构建Gemini API URL
      const url = new URL(request.url);
      const geminiPath = url.pathname.replace('/api/gemini', '');
      const geminiUrl = `https://generativelanguage.googleapis.com${geminiPath}${url.search}`;

      // 转发请求到Gemini API
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
        body: body
      });

      const responseData = await geminiResponse.text();

      // 返回响应，添加CORS头
      return new Response(responseData, {
        status: geminiResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Proxy error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin
        }
      });
    }
  }
};