import { wrap, Remote } from 'comlink';
import { useEffect, useRef, useState, useCallback } from 'react';

type ContentProcessor = {
  processMarkdown(content: string): Promise<string>;
  generateMermaidDiagram(definition: string): Promise<string>;
  highlightCode(code: string, language: string): Promise<string>;
  renderMath(latex: string, displayMode?: boolean): Promise<string>;
  processTableData(rawData: string, format?: 'csv' | 'json' | 'markdown'): Promise<{
    headers: string[];
    rows: string[][];
    metadata: { rowCount: number; columnCount: number; };
  }>;
  optimizeImage(imageData: ArrayBuffer, options?: any): Promise<ArrayBuffer>;
  analyzeText(text: string): Promise<any>;
  runPerformanceBenchmark(): Promise<any>;
};

/**
 * Web Worker管理器
 * 负责创建、管理和复用Worker实例
 */
class WorkerManager {
  private static instance: WorkerManager;
  private workers: Map<string, Remote<ContentProcessor>> = new Map();
  private workerPool: Remote<ContentProcessor>[] = [];
  private readonly maxWorkers = navigator.hardwareConcurrency || 4;
  private currentWorkerIndex = 0;

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  async getWorker(taskType: string = 'default'): Promise<Remote<ContentProcessor>> {
    // 检查是否已有专用Worker
    if (this.workers.has(taskType)) {
      return this.workers.get(taskType)!;
    }

    // 创建新的Worker
    const worker = this.createWorker();
    this.workers.set(taskType, worker);
    
    return worker;
  }

  async getPooledWorker(): Promise<Remote<ContentProcessor>> {
    // 如果工作池为空，创建Workers
    if (this.workerPool.length === 0) {
      for (let i = 0; i < this.maxWorkers; i++) {
        this.workerPool.push(this.createWorker());
      }
    }

    // 轮询选择Worker
    const worker = this.workerPool[this.currentWorkerIndex];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workerPool.length;
    
    return worker;
  }

  private createWorker(): Remote<ContentProcessor> {
    const worker = new Worker(
      new URL('../workers/contentProcessor.ts', import.meta.url),
      { type: 'module' }
    );
    
    return wrap<ContentProcessor>(worker);
  }

  async terminateWorker(taskType: string): Promise<void> {
    const worker = this.workers.get(taskType);
    if (worker) {
      await (worker as any)[Symbol.dispose]?.();
      this.workers.delete(taskType);
    }
  }

  async terminateAllWorkers(): Promise<void> {
    const terminatePromises = Array.from(this.workers.entries()).map(
      async ([taskType]) => this.terminateWorker(taskType)
    );
    
    const poolTerminatePromises = this.workerPool.map(
      async (worker) => (worker as any)[Symbol.dispose]?.()
    );

    await Promise.all([...terminatePromises, ...poolTerminatePromises]);
    this.workerPool = [];
  }
}

/**
 * React Hook: Web Worker内容处理
 */
export function useContentProcessor() {
  const workerManagerRef = useRef<WorkerManager>();
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    workerManagerRef.current = WorkerManager.getInstance();
    setIsWorkerReady(true);

    return () => {
      workerManagerRef.current?.terminateAllWorkers();
    };
  }, []);

  const processWithWorker = useCallback(async <T>(
    taskId: string,
    taskType: string,
    operation: (worker: Remote<ContentProcessor>) => Promise<T>
  ): Promise<T> => {
    if (!isWorkerReady || !workerManagerRef.current) {
      throw new Error('Worker not ready');
    }

    // 标记任务开始
    setProcessingTasks(prev => new Set(prev.add(taskId)));

    try {
      const worker = await workerManagerRef.current.getWorker(taskType);
      const result = await operation(worker);
      return result;
    } catch (error) {
      console.error(`Worker task ${taskId} failed:`, error);
      throw error;
    } finally {
      // 标记任务完成
      setProcessingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  }, [isWorkerReady]);

  // Markdown处理
  const processMarkdown = useCallback(async (content: string): Promise<string> => {
    const taskId = `markdown_${Date.now()}`;
    return processWithWorker(taskId, 'markdown', worker => 
      worker.processMarkdown(content)
    );
  }, [processWithWorker]);

  // Mermaid图表生成
  const generateMermaidDiagram = useCallback(async (definition: string): Promise<string> => {
    const taskId = `mermaid_${Date.now()}`;
    return processWithWorker(taskId, 'mermaid', worker => 
      worker.generateMermaidDiagram(definition)
    );
  }, [processWithWorker]);

  // 代码高亮
  const highlightCode = useCallback(async (code: string, language: string): Promise<string> => {
    const taskId = `highlight_${Date.now()}`;
    return processWithWorker(taskId, 'highlight', worker => 
      worker.highlightCode(code, language)
    );
  }, [processWithWorker]);

  // 数学公式渲染
  const renderMath = useCallback(async (latex: string, displayMode = false): Promise<string> => {
    const taskId = `math_${Date.now()}`;
    return processWithWorker(taskId, 'math', worker => 
      worker.renderMath(latex, displayMode)
    );
  }, [processWithWorker]);

  // 表格数据处理
  const processTableData = useCallback(async (
    rawData: string, 
    format: 'csv' | 'json' | 'markdown' = 'csv'
  ) => {
    const taskId = `table_${Date.now()}`;
    return processWithWorker(taskId, 'table', worker => 
      worker.processTableData(rawData, format)
    );
  }, [processWithWorker]);

  // 图像优化
  const optimizeImage = useCallback(async (
    imageData: ArrayBuffer,
    options?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
    }
  ) => {
    const taskId = `image_${Date.now()}`;
    return processWithWorker(taskId, 'image', worker => 
      worker.optimizeImage(imageData, options)
    );
  }, [processWithWorker]);

  // 文本分析
  const analyzeText = useCallback(async (text: string) => {
    const taskId = `analyze_${Date.now()}`;
    return processWithWorker(taskId, 'analyze', worker => 
      worker.analyzeText(text)
    );
  }, [processWithWorker]);

  // 性能基准测试
  const runBenchmark = useCallback(async () => {
    const taskId = `benchmark_${Date.now()}`;
    return processWithWorker(taskId, 'benchmark', worker => 
      worker.runPerformanceBenchmark()
    );
  }, [processWithWorker]);

  // 批量处理
  const batchProcess = useCallback(async <T>(
    tasks: Array<{ id: string; operation: (worker: Remote<ContentProcessor>) => Promise<T> }>
  ): Promise<T[]> => {
    if (!isWorkerReady || !workerManagerRef.current) {
      throw new Error('Worker not ready');
    }

    const results = await Promise.allSettled(
      tasks.map(async task => {
        const worker = await workerManagerRef.current!.getPooledWorker();
        return task.operation(worker);
      })
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        throw result.reason;
      }
    });
  }, [isWorkerReady]);

  return {
    isWorkerReady,
    processingTasks: Array.from(processingTasks),
    isProcessing: processingTasks.size > 0,
    
    // 内容处理方法
    processMarkdown,
    generateMermaidDiagram,
    highlightCode,
    renderMath,
    processTableData,
    optimizeImage,
    analyzeText,
    runBenchmark,
    batchProcess
  };
}

/**
 * React Hook: 高性能内容渲染
 */
export function useOptimizedContentRenderer() {
  const {
    processMarkdown,
    generateMermaidDiagram,
    highlightCode,
    renderMath,
    isProcessing
  } = useContentProcessor();

  const [renderedContent, setRenderedContent] = useState<Map<string, string>>(new Map());
  const [renderingErrors, setRenderingErrors] = useState<Map<string, Error>>(new Map());

  const renderContent = useCallback(async (
    content: string,
    type: 'markdown' | 'mermaid' | 'code' | 'math',
    options?: { language?: string; displayMode?: boolean }
  ) => {
    const cacheKey = `${type}_${btoa(content)}_${JSON.stringify(options || {})}`;
    
    // 检查缓存
    if (renderedContent.has(cacheKey)) {
      return renderedContent.get(cacheKey)!;
    }

    try {
      let result: string;
      
      switch (type) {
        case 'markdown':
          result = await processMarkdown(content);
          break;
        case 'mermaid':
          result = await generateMermaidDiagram(content);
          break;
        case 'code':
          result = await highlightCode(content, options?.language || 'text');
          break;
        case 'math':
          result = await renderMath(content, options?.displayMode || false);
          break;
        default:
          result = content;
      }

      // 更新缓存
      setRenderedContent(prev => new Map(prev.set(cacheKey, result)));
      
      // 清除错误
      if (renderingErrors.has(cacheKey)) {
        setRenderingErrors(prev => {
          const newMap = new Map(prev);
          newMap.delete(cacheKey);
          return newMap;
        });
      }

      return result;
    } catch (error) {
      console.error(`Content rendering failed for type ${type}:`, error);
      
      // 记录错误
      setRenderingErrors(prev => new Map(prev.set(cacheKey, error as Error)));
      
      // 返回原始内容作为降级
      return content;
    }
  }, [processMarkdown, generateMermaidDiagram, highlightCode, renderMath, renderedContent, renderingErrors]);

  const clearCache = useCallback(() => {
    setRenderedContent(new Map());
    setRenderingErrors(new Map());
  }, []);

  const getCacheStats = useCallback(() => ({
    cacheSize: renderedContent.size,
    errorCount: renderingErrors.size,
    memoryUsage: `${(JSON.stringify([...renderedContent.values()]).length / 1024 / 1024).toFixed(2)} MB`
  }), [renderedContent, renderingErrors]);

  return {
    renderContent,
    isProcessing,
    clearCache,
    getCacheStats,
    errors: renderingErrors
  };
}