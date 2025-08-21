# Gemini Chat App - Deployment Guide

## CORS Issue Solution

### Problem Description
Frontend applications directly calling Google Gemini API will encounter CORS (Cross-Origin Resource Sharing) issues, as browsers will block these requests.

### Solutions

#### 1. Local Development
For local development, use Vite proxy configured in `vite.config.ts`:

```typescript
proxy: {
  '/api/gemini': {
    target: 'https://generativelanguage.googleapis.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
  }
}
```

#### 2. Cloudflare Pages Deployment

##### Step 1: Create Cloudflare Worker

1. Log into Cloudflare console
2. Navigate to "Workers & Pages" 
3. Click "Create Application" > "Create Worker"
4. Copy the following code to the Worker editor:

```javascript
// Cloudflare Worker - Proxy Gemini API requests
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Get request body
      const body = await request.text();
      const url = new URL(request.url);
      
      // Build Gemini API URL
      const geminiPath = url.pathname.replace('/api/gemini', '');
      const geminiUrl = `https://generativelanguage.googleapis.com${geminiPath}${url.search}`;

      // Forward request to Gemini API
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': request.headers.get('x-goog-api-key') || request.headers.get('Authorization')?.replace('Bearer ', '') || '',
        },
        body: body
      });

      const responseData = await geminiResponse.text();

      // Return response with CORS headers
      return new Response(responseData, {
        status: geminiResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
```

5. Click "Save and Deploy"
6. Record the Worker URL, format: `https://your-worker-name.your-subdomain.workers.dev`

##### Step 2: Configure Routing

**Method A: Use Worker Routes (Recommended)**

1. In the Cloudflare console, go to your domain settings
2. Click "Workers Routes"
3. Add route:
   - Route: `your-domain.com/api/gemini/*`
   - Worker: Select the Worker created above

**Method B: Use Environment Variables**

Add environment variable in your build settings:
```
VITE_GEMINI_PROXY_URL=https://your-worker-name.your-subdomain.workers.dev
```

##### Step 3: Deploy Frontend Application

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy the application

#### 3. Verify Deployment

After deployment, check:

1. **Console Logs**: Should see `🌐 Using Gemini API proxy: https://your-domain.com/api/gemini`
2. **Network Requests**: Confirm in developer tools that API requests point to proxy address
3. **Functionality Test**: Send messages to test AI response functionality

#### 4. Troubleshooting

**Common Issues:**

1. **Worker 500 Error**: Check Worker code and logs
2. **Still CORS Errors**: Ensure Worker route configuration is correct
3. **API Key Errors**: Check if key transmission is correct

**Debug Steps:**

1. Check Cloudflare Worker logs
2. Inspect browser network requests
3. Confirm API key format is correct

### Cloudflare Insights Issues

If you see Cloudflare Insights CORS errors, these are normal warnings and don't affect application functionality. CSP headers have been added in `index.html` to reduce these warnings.

To completely disable Cloudflare Insights:
1. Go to Cloudflare console
2. Navigate to "Analytics" > "Web Analytics"  
3. Disable "Cloudflare Web Analytics"

## Security Considerations

1. **API Key Protection**: Ensure API keys are only used on client-side, Worker doesn't log keys
2. **Domain Restrictions**: Consider adding domain whitelist restrictions in Worker
3. **Rate Limiting**: Consider adding rate limiting protection in Worker

## Monitoring and Maintenance

1. Regularly check Worker usage and error logs
2. Monitor API quota usage  
3. Keep Worker code updated