// 完整的时间周期使用示例
const { TimeFrame, fetchStockData } = require('../dist/eastmoney-adapter.js');
const { runFormula, runWithSymbol, runBatchWithSymbols } = require('../dist/runner.js');

async function completeExample() {
  console.log('🎯 完整的时间周期和Worker示例\n');

  const symbol = '1.600519'; // 贵州茅台
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10).replace(/-/g, '');
  const startDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

  // 复杂技术分析公式（简化为单行）
  const complexFormula = 'MA20: MA(C, 20); RSI14: RSI(C, 14)';

  try {
    // 1. 不同时间周期的数据分析
    console.log('📍 测试不同时间周期的技术分析...\n');
    
    const timeFrames = [
      { frame: TimeFrame.MIN_5, name: '5分钟' },
      { frame: TimeFrame.MIN_60, name: '60分钟' },
      { frame: TimeFrame.DAILY, name: '日线' },
      { frame: TimeFrame.WEEKLY, name: '周线' }
    ];

    for (const { frame, name } of timeFrames) {
      console.log(`📊 ${name}K线分析...`);
      
      const result = await runWithSymbol(
        'MA20: MA(C, 20)',
        symbol,
        startDate,
        endDate,
        frame,
        { useWorker: true }
      );

      if (result.success) {
        const ma20 = result.data?.find(line => line.name === 'MA20');
        const rsi = result.data?.find(line => line.name === 'RSI14');
        
        console.log(`✅ ${name}: 数据量=${ma20?.values?.length}, Worker=${result.workerUsed}ms, 耗时=${result.executionTime}ms`);
        if (ma20 && rsi) {
          const latestMA = ma20.values[ma20.values.length - 1];
          const latestRSI = rsi.values[rsi.values.length - 1];
          console.log(`   MA20=${latestMA?.toFixed(2)}, RSI14=${latestRSI?.toFixed(2)}`);
        }
      } else {
        console.log(`❌ ${name}分析失败: ${result.error}`);
      }
      console.log('');
    }

    // 2. 批量多股票分析
    console.log('🔄 批量多股票分析（日线）...\n');
    
    const symbols = ['1.600519', '0.000001', '1.000858']; // 茅台、平安、五粮液
    
    const batchResult = await runBatchWithSymbols(
      'MA20: MA(C, 20); BREAKOUT: CROSS(C, MA20)',
      symbols,
      startDate,
      endDate,
      undefined, // 默认日线
      { useWorker: true, workerCount: 2 }
    );

    if (batchResult.success) {
      console.log(`✅ 批量分析完成: ${batchResult.results?.length}个结果`);
      console.log(`⚡ 耗时: ${batchResult.executionTime}ms, Worker=${batchResult.workerUsed}`);
      
      // 显示每个股票的分析结果
      for (const result of batchResult.results || []) {
        if (result.name === 'BREAKOUT') {
          const hasSignal = result.values.some(v => v === 1);
          const signalCount = result.values.filter(v => v === 1).length;
          console.log(`   ${result.symbol}: 突破信号${signalCount}次, 有信号=${hasSignal}`);
        }
      }
    } else {
      console.log(`❌ 批量分析失败: ${batchResult.errors?.join(', ')}`);
    }

    // 3. Worker性能测试
    console.log('\n⚡ Worker性能对比测试...\n');
    
    // 使用更大的数据集进行性能测试
    const perfStartDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
    
    // 主线程测试
    const mainThreadStart = Date.now();
    const mainResult = await runWithSymbol(
      'MA5: MA(C, 5); MA10: MA(C, 10); MA20: MA(C, 20); RSI14: RSI(C, 14)',
      symbol,
      perfStartDate,
      endDate,
      TimeFrame.MIN_30,
      { useWorker: false }
    );
    const mainThreadTime = Date.now() - mainThreadStart;

    // Worker线程测试
    const workerThreadStart = Date.now();
    const workerResult = await runWithSymbol(
      'MA5: MA(C, 5); MA10: MA(C, 10); MA20: MA(C, 20); RSI14: RSI(C, 14)',
      symbol,
      perfStartDate,
      endDate,
      TimeFrame.MIN_30,
      { useWorker: true }
    );
    const workerThreadTime = Date.now() - workerThreadStart;

    console.log(`📊 性能对比（30分钟K线，${mainResult.data?.[0]?.values?.length}条数据）:`);
    console.log(`   主线程: ${mainThreadTime}ms, Worker: ${workerThreadTime}ms`);
    
    if (mainThreadTime > workerThreadTime) {
      const improvement = ((mainThreadTime - workerThreadTime) / mainThreadTime * 100).toFixed(1);
      console.log(`   ⚡ Worker性能提升: ${improvement}%`);
    } else {
      const overhead = ((workerThreadTime - mainThreadTime) / mainThreadTime * 100).toFixed(1);
      console.log(`   📈 Worker启动开销: ${overhead}%（数据量较小）`);
    }

    console.log('\n✨ 完整示例执行完成！');

  } catch (error) {
    console.error('❌ 示例执行失败:', error.message);
  }
}

completeExample();
