// Playwright 浏览器自动化测试
// 专门测试 Gemini 应用的核心功能

const { test, expect } = require('@playwright/test');

test.describe('Gemini 应用功能测试', () => {
  const BASE_URL = 'http://localhost:5173';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('应用基础加载测试', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/Gemini/);
    
    // 验证主要UI元素存在
    await expect(page.locator('#root')).toBeVisible();
    
    // 检查是否有聊天输入框
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await expect(chatInput).toBeVisible();
  });

  test('Mermaid 中文图表渲染测试', async ({ page }) => {
    // 模拟发送包含 Mermaid 图表的消息
    const chatInput = page.locator('textarea').first();
    
    const mermaidMessage = `请画一个泡茶的流程图

\`\`\`mermaid
graph TD
    A[开始: 准备泡茶] --> B(准备茶具和茶叶)
    B --> C(烧水)
    C --> D{水开了吗?}
    D -->|否| C
    D -->|是| E(将茶叶放入茶壶)
    E --> F(将开水倒入茶壶)
    F --> G(浸泡茶叶)
    G --> H{茶泡好了吗?}
    H -->|否| G
    H -->|是| I(将茶倒入杯中)
    I --> J[结束: 享用茶]
\`\`\``;

    await chatInput.fill(mermaidMessage);
    
    // 查找发送按钮并点击
    const sendButton = page.locator('button[type="submit"], button:has-text("发送"), button:has-text("Send")').first();
    await sendButton.click();
    
    // 等待 Mermaid 图表渲染
    await page.waitForSelector('svg', { timeout: 10000 });
    
    // 验证 SVG 图表是否包含中文文本
    const svgElement = page.locator('svg').first();
    await expect(svgElement).toBeVisible();
    
    // 检查图表中是否包含中文节点
    const svgContent = await svgElement.innerHTML();
    expect(svgContent).toContain('开始');
    expect(svgContent).toContain('泡茶');
  });

  test('文件上传功能测试', async ({ page }) => {
    // 查找文件上传按钮
    const fileUploadButton = page.locator('input[type="file"], button:has-text("上传"), [data-testid="file-upload"]').first();
    
    if (await fileUploadButton.isVisible()) {
      // 创建测试文件
      const testFile = await page.evaluateHandle(() => {
        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        return file;
      });
      
      await fileUploadButton.setInputFiles(testFile);
      
      // 验证文件上传成功提示
      await expect(page.locator(':has-text("上传成功"), :has-text("uploaded")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('响应式设计测试', async ({ page }) => {
    // 测试桌面端
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 验证侧边栏在桌面端的显示
    const sidebar = page.locator('[data-testid="sidebar"], .sidebar, aside').first();
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible();
    }
    
    // 测试移动端
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 验证移动端布局调整
    const mobileMenu = page.locator('button:has-text("菜单"), button:has-text("Menu"), [data-testid="mobile-menu"]').first();
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('设置模态框测试', async ({ page }) => {
    // 查找设置按钮
    const settingsButton = page.locator('button:has-text("设置"), button:has-text("Settings"), [data-testid="settings"]').first();
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // 验证设置模态框打开
      const modal = page.locator('.modal, [role="dialog"], [data-testid="settings-modal"]').first();
      await expect(modal).toBeVisible();
      
      // 查找 API 密钥输入框
      const apiKeyInput = page.locator('input[placeholder*="API"], input[type="password"]').first();
      if (await apiKeyInput.isVisible()) {
        await expect(apiKeyInput).toBeVisible();
      }
    }
  });

  test('性能监控界面测试', async ({ page }) => {
    // 查找性能监控按钮
    const performanceButton = page.locator('button:has-text("性能"), button:has-text("Performance"), [data-testid="performance"]').first();
    
    if (await performanceButton.isVisible()) {
      await performanceButton.click();
      
      // 验证性能监控界面
      const performanceModal = page.locator(':has-text("性能监控"), :has-text("Performance Monitor")').first();
      await expect(performanceModal).toBeVisible();
    }
  });

  test('错误处理测试', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/**', route => route.abort());
    
    const chatInput = page.locator('textarea').first();
    await chatInput.fill('测试消息');
    
    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();
    
    // 验证错误提示显示
    await expect(page.locator(':has-text("错误"), :has-text("Error"), .error')).toBeVisible({ timeout: 5000 });
  });
});

// 导出测试配置
module.exports = {
  testDir: './tests',
  timeout: 30000,
  use: {
    browserName: 'chromium',
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
};