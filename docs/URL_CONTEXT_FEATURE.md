# URL Context Feature Documentation

## Overview

The Gemini Chat Application now supports **URL Context** functionality, which allows the AI to directly analyze and understand content from web pages. This feature leverages Google's Gemini API URL context tool to provide rich, contextual responses based on web content.

## Features

### Automatic URL Detection
- 🔍 **Smart Detection**: Automatically detects URLs in user messages
- ⚡ **Auto-Enable**: Automatically enables URL context when URLs are found
- 🎯 **Multi-URL Support**: Can analyze multiple URLs simultaneously
- 📊 **Status Tracking**: Shows retrieval status for each URL

### Configuration Options
- ✅ **Enable/Disable**: Toggle URL context functionality on/off
- 🔢 **URL Limits**: Configure maximum number of URLs to analyze (1-10)
- 📋 **Preset URLs**: Configure frequently used URLs for quick access
- ⚙️ **Per-Conversation**: Settings can be configured per conversation

### Supported Content Types
- 📰 **News Articles**: Latest news and current events
- 📚 **Documentation**: Technical docs and guides
- 📝 **Blog Posts**: Personal and professional blogs
- 🔬 **Research Papers**: Academic and scientific content
- 📊 **Data Pages**: Statistics and reports
- 🛍️ **Product Pages**: E-commerce and product information

## How to Use

### Method 1: Direct URL in Message
Simply include a URL in your message:
```
Analyze this article: https://example.com/news/latest-tech-trends
```

### Method 2: Multiple URLs for Comparison
```
Compare these two articles:
https://site1.com/article1
https://site2.com/article2
```

### Method 3: Specific Analysis Request
```
What are the key points from this documentation: https://docs.example.com/guide
```

### Method 4: URL with Context
```
Based on this report https://research.org/data, what trends should we focus on?
```

## Configuration

### Access Settings
1. Click the **Settings** (⚙️) button in the sidebar
2. Navigate to the **"URL 分析"** (URL Analysis) tab
3. Configure your preferences

### Available Settings

#### Enable URL Analysis
- **Purpose**: Turn URL context functionality on/off
- **Default**: Auto-enabled when URLs are detected
- **Recommendation**: Keep enabled for enhanced responses

#### Maximum URLs
- **Options**: 1, 3, 5, or 10 URLs
- **Default**: 3 URLs
- **Impact**: More URLs = more comprehensive analysis but slower response

#### Preset URL List
- **Purpose**: Save frequently analyzed URLs
- **Usage**: Pre-configure URLs for quick analysis
- **Management**: Add, edit, or remove URLs as needed

## Technical Details

### Supported Models
URL Context is supported on these Gemini models:
- ✅ Gemini 2.5 Pro
- ✅ Gemini 2.5 Flash  
- ✅ Gemini 2.5 Flash-Lite
- ✅ Gemini 2.0 Flash (experimental)

### URL Retrieval Status
The system tracks retrieval status for each URL:
- `URL_RETRIEVAL_STATUS_SUCCESS` - ✅ Successfully retrieved
- `URL_RETRIEVAL_STATUS_ERROR` - ❌ Failed to retrieve
- `URL_RETRIEVAL_STATUS_PAYWALL` - 💰 Behind paywall
- `URL_RETRIEVAL_STATUS_UNSAFE` - ⚠️ Unsafe content detected

### Integration with Other Features
- **Grounding**: Can work alongside Google Search grounding
- **Streaming**: Supports both streaming and non-streaming responses
- **Model Switching**: Automatically switches models if needed
- **Thinking Mode**: Works with Gemini's thinking capabilities

## Best Practices

### URL Selection
- ✅ **Use public URLs**: Ensure URLs are publicly accessible
- ✅ **Prefer HTTPS**: More reliable than HTTP URLs
- ✅ **Check content**: Verify URLs contain relevant content
- ❌ **Avoid paywalls**: URLs behind paywalls may not be accessible

### Message Structure
- Be specific about what you want to analyze
- Provide context for better AI understanding
- Ask focused questions about the content
- Use multiple URLs for comparison when relevant

### Performance Optimization
- **Fewer URLs = Faster**: Start with 1-2 URLs for quick responses
- **Combine features**: Use with grounding for comprehensive analysis
- **Model selection**: Choose appropriate model for your needs

## Troubleshooting

### Common Issues

#### URLs Not Being Analyzed
**Symptoms**: AI doesn't reference URL content
**Solutions**:
1. Verify URL context is enabled in settings
2. Check if URL is publicly accessible
3. Ensure model supports URL context
4. Try with a different URL

#### Slow Response Times
**Symptoms**: Long delays when URLs are included
**Solutions**:
1. Reduce number of URLs (max 3 recommended)
2. Use faster model (Gemini 2.5 Flash-Lite)
3. Disable other features like grounding temporarily
4. Check internet connection

#### URL Retrieval Failures
**Symptoms**: "Could not access URLs" warning
**Solutions**:
1. Verify URLs are valid and accessible
2. Check for paywalls or login requirements
3. Try different URLs from the same domain
4. Wait and retry (temporary server issues)

### Error Messages

#### "URL context analysis failed"
- **Cause**: Network error or API limitation
- **Solution**: Retry with fewer URLs or check connection

#### "Could not access some URLs"
- **Cause**: URLs behind paywalls or private content
- **Solution**: Use publicly accessible alternatives

#### "URL retrieval status unsafe"
- **Cause**: Security filters blocked the content
- **Solution**: Use different, trusted sources

## Advanced Usage

### Combining with Grounding
```
What are the latest trends in AI according to:
- This research paper: https://arxiv.org/paper123
- Recent news articles (use search)
```

### Analytical Workflows
```
Based on these sources, create a comparison:
1. https://competitor1.com/features
2. https://competitor2.com/pricing
3. https://industry-report.com/analysis
```

### Content Summarization
```
Summarize the key insights from these reports:
https://report1.com, https://report2.com, https://report3.com
```

## API Integration

### For Developers
The URL context feature integrates with the existing Gemini service:

```typescript
// Auto-detection in chat messages
const enhancedConfig = {
  urlContextConfig: {
    enabled: true,
    maxUrls: 3,
    urls: extractUrlsFromMessage(userMessage)
  }
};

// Manual URL analysis
const result = await geminiService.analyzeUrls(
  ['https://example.com/page'],
  'Analyze this content',
  'gemini-2.5-flash'
);
```

### Configuration Schema
```typescript
interface UrlContextConfig {
  enabled: boolean;
  urls?: string[];
  maxUrls?: number; // 1-10
}

interface UrlContextMetadata {
  urlMetadata?: Array<{
    retrievedUrl: string;
    urlRetrievalStatus: string;
  }>;
}
```

## Limitations

### Content Restrictions
- Cannot access content behind paywalls
- Cannot access private or login-required pages
- Cannot process dynamic/JavaScript-heavy content
- Cannot access local/intranet URLs

### Rate Limits
- Subject to Gemini API rate limits
- Multiple URLs count toward token usage
- May be slower than regular chat responses

### Model Support
- Only available on newer Gemini models
- Feature availability depends on model capabilities
- Some experimental models may have limited support

## Future Enhancements

### Planned Features
- 📱 **Mobile optimization**: Better mobile URL handling
- 🔄 **URL caching**: Cache frequently accessed URLs
- 📊 **Analytics**: URL analysis success metrics
- 🎯 **Smart suggestions**: Suggest relevant URLs
- 🔍 **Content preview**: Show URL content previews

### Integration Roadmap
- **PDF support**: Direct PDF URL analysis
- **Video transcripts**: YouTube and video URL analysis
- **Social media**: Tweet and post analysis
- **Real-time updates**: Live webpage monitoring

## Support

### Getting Help
- Check this documentation first
- Review error messages and troubleshooting steps
- Test with known working URLs
- Report issues with specific URLs and error details

### Feedback
The URL Context feature is continuously improving. Please provide feedback on:
- Feature usability and performance
- URL compatibility issues
- Suggested improvements and new features
- Integration with existing workflows

---

*Last updated: January 2025*
*Compatible with: Gemini Chat Application v2.0+*