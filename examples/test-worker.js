// 测试Node.js Worker功能的示例
const { FormulaRunner } = require('../dist/runner');

// 测试数据
const testData = {
  symbol: '600000',
  name: '浦发银行',
  date: Array.from({ length: 100 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`),
  opens: Array.from({ length: 100 }, () => 10 + Math.random()),
  highs: Array.from({ length: 100 }, () => 11 + Math.random()),
  lows: Array.from({ length: 100 }, () => 9 + Math.random()),
  closes: Array.from({ length: 100 }, () => 10 + Math.random()),
  volumes: Array.from({ length: 100 }, () => 1000000 + Math.random() * 500000)
};

async function testWorker() {
  console.log('🧪 测试Node.js Worker功能...\n');

  try {
    // 测试1: 主线程执行
    console.log('📍 测试1: 主线程执行');
    const mainRunner = new FormulaRunner({ useWorker: false });
    const mainStart = Date.now();
    const mainResult = await mainRunner.runFormula('MA5: MA(C, 5)', testData);
    const mainTime = Date.now() - mainStart;
    
    console.log(`✅ 主线程执行成功: ${mainResult.success}`);
    console.log(`📊 执行时间: ${mainTime}ms`);
    console.log(`🔧 Worker使用: ${mainResult.workerUsed}`);
    console.log(`📈 结果长度: ${mainResult.data?.[0]?.values?.length}`);
    console.log();

    // 测试2: 强制Worker执行
    console.log('📍 测试2: 强制Worker执行');
    const workerRunner = new FormulaRunner({ useWorker: true });
    const workerStart = Date.now();
    const workerResult = await workerRunner.runFormula('MA5: MA(C, 5)', testData);
    const workerTime = Date.now() - workerStart;
    
    console.log(`✅ Worker执行成功: ${workerResult.success}`);
    console.log(`📊 执行时间: ${workerTime}ms`);
    console.log(`🔧 Worker使用: ${workerResult.workerUsed}`);
    console.log(`📈 结果长度: ${workerResult.data?.[0]?.values?.length}`);
    console.log();

    // 测试3: 复杂公式（单行）
    console.log('📍 测试3: 复杂公式（单行）');
    const complexFormula = 'SIGNAL: IF(CROSS(C, MA(C, 5)) AND MA(C, 5) > MA(C, 20), 1, 0)';
    
    const complexStart = Date.now();
    const complexResult = await workerRunner.runFormula(complexFormula, testData);
    const complexTime = Date.now() - complexStart;
    
    console.log(`✅ 复杂公式执行成功: ${complexResult.success}`);
    console.log(`📊 执行时间: ${complexTime}ms`);
    console.log(`🔧 Worker使用: ${complexResult.workerUsed}`);
    console.log(`📈 输出行数: ${complexResult.data?.length}`);
    if (complexResult.error) {
      console.log(`❌ 错误信息: ${complexResult.error}`);
    }
    console.log();

    // 测试4: 批量执行
    console.log('📍 测试4: 批量执行');
    const smallBatchData = [
      {
        symbol: '600000',
        name: '浦发银行',
        date: testData.date.slice(0, 10),
        opens: testData.opens.slice(0, 10),
        highs: testData.highs.slice(0, 10),
        lows: testData.lows.slice(0, 10),
        closes: testData.closes.slice(0, 10),
        volumes: testData.volumes.slice(0, 10)
      },
      {
        symbol: '600001',
        name: '深发展A',
        date: testData.date.slice(0, 10),
        opens: testData.opens.slice(0, 10).map(v => v + 5),
        highs: testData.highs.slice(0, 10).map(v => v + 5),
        lows: testData.lows.slice(0, 10).map(v => v + 5),
        closes: testData.closes.slice(0, 10).map(v => v + 5),
        volumes: testData.volumes.slice(0, 10)
      },
      {
        symbol: '600002',
        name: '万科A',
        date: testData.date.slice(0, 10),
        opens: testData.opens.slice(0, 10).map(v => v + 10),
        highs: testData.highs.slice(0, 10).map(v => v + 10),
        lows: testData.lows.slice(0, 10).map(v => v + 10),
        closes: testData.closes.slice(0, 10).map(v => v + 10),
        volumes: testData.volumes.slice(0, 10)
      }
    ];
    
    const batchStart = Date.now();
    const batchResult = await workerRunner.runBatchFormula('MA5: MA(C, 5)', smallBatchData);
    const batchTime = Date.now() - batchStart;
    
    console.log(`✅ 批量执行成功: ${batchResult.success}`);
    console.log(`📊 执行时间: ${batchTime}ms`);
    console.log(`🔧 Worker使用: ${batchResult.workerUsed}`);
    console.log(`📈 结果数量: ${batchResult.results?.length}`);
    if (batchResult.error) {
      console.log(`❌ 错误信息: ${batchResult.error}`);
    }
    if (batchResult.errors && batchResult.errors.length > 0) {
      console.log(`❌ 错误数组:`, batchResult.errors);
    }
    if (batchResult.results) {
      batchResult.results.forEach((r, i) => {
        console.log(`  - ${r.symbol}: ${r.name} (${r.values.length} values)`);
      });
    }
    console.log();

    // 结果对比
    console.log('📍 结果对比');
    const mainValues = mainResult.data?.[0]?.values?.slice(0, 5);
    const workerValues = workerResult.data?.[0]?.values?.slice(0, 5);
    
    console.log('主线程前5个值:', mainValues);
    console.log('Worker前5个值:', workerValues);
    console.log('结果一致:', JSON.stringify(mainValues) === JSON.stringify(workerValues));
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行测试
testWorker();
