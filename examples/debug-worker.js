// 调试Worker问题的简单测试
const { FormulaRunner } = require('../dist/runner.js');

const testData = {
  symbol: '600000',
  name: '浦发银行',
  date: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
  opens: [10, 11, 12, 13, 14],
  highs: [11, 12, 13, 14, 15],
  lows: [9, 10, 11, 12, 13],
  closes: [10, 11, 12, 13, 14],
  volumes: [1000, 2000, 3000, 4000, 5000]
};

async function debugWorker() {
  console.log('🐛 调试Worker问题...\n');

  try {
    // 测试单数据批量处理
    console.log('📍 测试单数据批量处理');
    const runner = new FormulaRunner({ useWorker: true });
    const result = await runner.runBatchFormula('MA5: MA(C, 5)', [testData]);
    
    console.log('✅ 批量结果:', {
      success: result.success,
      resultsCount: result.results?.length,
      errors: result.errors,
      data: result.results?.map(r => ({
        symbol: r.symbol,
        name: r.name,
        values: r.values.slice(0, 3)
      }))
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('堆栈:', error.stack);
  }
}

debugWorker();
