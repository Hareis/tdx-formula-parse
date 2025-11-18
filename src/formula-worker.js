// Worker Pool 兼容的 Worker 实现
const { worker } = require('workerpool');

// 动态导入ES模块
async function loadModules() {
  try {
    // 尝试从编译后的目录加载
    const { createRunner } = await import('../dist/runner.js');
    return { createRunner };
  } catch (error) {
    // 如果失败，尝试从源码目录加载
    const { createRunner } = await import('./runner.js');
    return { createRunner };
  }
}

// 处理单个股票数据
async function processFormula(formulaText, data, options) {
  const startTime = Date.now();

  const { createRunner } = await loadModules();
  try {
    console.log(`Worker: Processing ${data.symbol} ...`);

    const runner = createRunner();
    // 执行计算
    const result = await runner.runFormula(formulaText, data);

    const executionTime = Date.now() - startTime;

    console.log(`Worker: Success for ${data.symbol}, output lines: ${result.data.length}`);

    return {
      success: true,
      data: result.data,
      executionTime,
      workerUsed: true
    };
  } catch (error) {
    console.log(`Worker: Error for ${data.symbol}:`, error.message);
    console.log(`Worker: Stack:`, error.stack);
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

// 注册worker方法
worker({
  processFormula
});
