import { expose } from 'comlink';

/**
 * Web Worker for heavy content processing
 * 在worker线程中处理计算密集型任务，避免阻塞主线程
 */
class ContentProcessor {
  /**
   * 处理Markdown内容
   */
  async processMarkdown(content: string): Promise<string> {
    try {
      // 动态导入markdown处理器
      const [
        { unified },
        { remarkParse },
        { remarkGfm },
        { remarkMath },
        { remarkRehype },
        { rehypeKatex },
        { rehypeStringify },
        { rehypeSanitize }
      ] = await Promise.all([
        import('unified'),
        import('remark-parse'),
        import('remark-gfm'),
        import('remark-math'),
        import('remark-rehype'),
        import('rehype-katex'),
        import('rehype-stringify'),
        import('rehype-sanitize')
      ]);

      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype, { allowDangerousHtml: false })
        .use(rehypeSanitize)
        .use(rehypeKatex, { output: 'html' })
        .use(rehypeStringify);

      const result = await processor.process(content);
      return String(result);
    } catch (error) {
      console.error('Markdown processing error:', error);
      return content; // 降级返回原始内容
    }
  }

  /**
   * 生成Mermaid图表
   */
  async generateMermaidDiagram(definition: string): Promise<string> {
    try {
      const mermaid = await import('mermaid');
      
      // 配置Mermaid
      mermaid.default.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'strict',
        fontFamily: 'Arial, sans-serif',
        logLevel: 'error'
      });

      const id = `diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { svg } = await mermaid.default.render(id, definition);
      
      return svg;
    } catch (error) {
      console.error('Mermaid generation error:', error);
      return `<div class="error">Failed to generate diagram</div>`;
    }
  }

  /**
   * 处理代码高亮
   */
  async highlightCode(code: string, language: string): Promise<string> {
    try {
      const { highlight, languages } = await import('prismjs');
      
      // 动态加载语言支持
      if (language && !languages[language]) {
        await import(`prismjs/components/prism-${language}`);
      }
      
      const highlighted = highlight(code, languages[language] || languages.text, language);
      return `<pre class="language-${language}"><code>${highlighted}</code></pre>`;
    } catch (error) {
      console.error('Code highlighting error:', error);
      return `<pre><code>${code}</code></pre>`;
    }
  }

  /**
   * 处理数学公式
   */
  async renderMath(latex: string, displayMode: boolean = false): Promise<string> {
    try {
      const katex = await import('katex');
      
      const html = katex.default.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false
      });
      
      return html;
    } catch (error) {
      console.error('Math rendering error:', error);
      return latex; // 降级返回原始LaTeX
    }
  }

  /**
   * 解析和处理表格数据
   */
  async processTableData(rawData: string, format: 'csv' | 'json' | 'markdown' = 'csv'): Promise<{
    headers: string[];
    rows: string[][];
    metadata: { rowCount: number; columnCount: number; };
  }> {
    try {
      let headers: string[] = [];
      let rows: string[][] = [];

      switch (format) {
        case 'csv':
          const lines = rawData.split('\n').filter(line => line.trim());
          headers = lines[0]?.split(',').map(h => h.trim()) || [];
          rows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));
          break;
          
        case 'json':
          const jsonData = JSON.parse(rawData);
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            headers = Object.keys(jsonData[0]);
            rows = jsonData.map(item => headers.map(header => String(item[header] || '')));
          }
          break;
          
        case 'markdown':
          const mdLines = rawData.split('\n').filter(line => line.includes('|'));
          if (mdLines.length >= 2) {
            headers = mdLines[0].split('|').map(h => h.trim()).filter(Boolean);
            rows = mdLines.slice(2).map(line => 
              line.split('|').map(c => c.trim()).filter(Boolean)
            );
          }
          break;
      }

      return {
        headers,
        rows,
        metadata: {
          rowCount: rows.length,
          columnCount: headers.length
        }
      };
    } catch (error) {
      console.error('Table processing error:', error);
      return {
        headers: ['Error'],
        rows: [['Failed to process table data']],
        metadata: { rowCount: 1, columnCount: 1 }
      };
    }
  }

  /**
   * 图像处理和优化
   */
  async optimizeImage(
    imageData: ArrayBuffer, 
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
    } = {}
  ): Promise<ArrayBuffer> {
    try {
      // 创建Image对象
      const blob = new Blob([imageData]);
      const bitmap = await createImageBitmap(blob);
      
      const { maxWidth = 1920, maxHeight = 1080, quality = 0.8, format = 'webp' } = options;
      
      // 计算新尺寸
      const ratio = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
      const newWidth = bitmap.width * ratio;
      const newHeight = bitmap.height * ratio;
      
      // 创建离屏画布
      const canvas = new OffscreenCanvas(newWidth, newHeight);
      const ctx = canvas.getContext('2d')!;
      
      // 绘制优化后的图像
      ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
      
      // 转换为指定格式
      const optimizedBlob = await canvas.convertToBlob({
        type: `image/${format}`,
        quality
      });
      
      bitmap.close();
      
      return await optimizedBlob.arrayBuffer();
    } catch (error) {
      console.error('Image optimization error:', error);
      return imageData; // 返回原始数据作为降级
    }
  }

  /**
   * 文本分析和处理
   */
  async analyzeText(text: string): Promise<{
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    readingTime: number; // 分钟
    keywords: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
  }> {
    try {
      const words = text.split(/\s+/).filter(word => word.length > 0);
      const characters = text.length;
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      // 阅读时间估算（假设平均阅读速度200词/分钟）
      const readingTime = Math.max(1, Math.ceil(words.length / 200));
      
      // 简单关键词提取（基于词频）
      const wordFreq = new Map<string, number>();
      words.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length > 3) { // 过滤短词
          wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1);
        }
      });
      
      const keywords = Array.from(wordFreq.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
      
      // 简单情感分析（基于关键词）
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing'];
      
      const positiveCount = positiveWords.reduce((count, word) => 
        count + (text.toLowerCase().includes(word) ? 1 : 0), 0);
      const negativeCount = negativeWords.reduce((count, word) => 
        count + (text.toLowerCase().includes(word) ? 1 : 0), 0);
      
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (positiveCount > negativeCount) sentiment = 'positive';
      else if (negativeCount > positiveCount) sentiment = 'negative';
      
      return {
        wordCount: words.length,
        characterCount: characters,
        paragraphCount: paragraphs.length,
        readingTime,
        keywords,
        sentiment
      };
    } catch (error) {
      console.error('Text analysis error:', error);
      return {
        wordCount: 0,
        characterCount: text.length,
        paragraphCount: 1,
        readingTime: 1,
        keywords: [],
        sentiment: 'neutral'
      };
    }
  }

  /**
   * 性能基准测试
   */
  async runPerformanceBenchmark(): Promise<{
    markdownProcessingTime: number;
    mermaidRenderingTime: number;
    codeHighlightingTime: number;
    workerMemoryUsage: number;
  }> {
    const results = {
      markdownProcessingTime: 0,
      mermaidRenderingTime: 0,
      codeHighlightingTime: 0,
      workerMemoryUsage: 0
    };

    try {
      // Markdown处理基准
      const markdownStart = performance.now();
      await this.processMarkdown('# Test\n\nThis is a **test** markdown with `code` and [link](http://example.com).');
      results.markdownProcessingTime = performance.now() - markdownStart;

      // Mermaid渲染基准
      const mermaidStart = performance.now();
      await this.generateMermaidDiagram('graph TD; A-->B; B-->C; C-->D;');
      results.mermaidRenderingTime = performance.now() - mermaidStart;

      // 代码高亮基准
      const codeStart = performance.now();
      await this.highlightCode('function test() { return "hello"; }', 'javascript');
      results.codeHighlightingTime = performance.now() - codeStart;

      // Worker内存使用情况（如果支持）
      if ('memory' in performance) {
        results.workerMemoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }

    } catch (error) {
      console.error('Benchmark error:', error);
    }

    return results;
  }
}

// 暴露worker接口
const contentProcessor = new ContentProcessor();
expose(contentProcessor);