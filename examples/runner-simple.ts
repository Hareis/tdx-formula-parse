// Runner简化使用示例
import { 
  runFormula, 
  runWithSymbol, 
  runBatchWithSymbols,
  createRunner,
  SimpleStockData 
} from '../src/runner';

// 示例1：最简单的使用方式
async function example1_basic() {
  console.log('=== 示例1：基本使用 ===\n');

  // 创建测试数据
  const data: SimpleStockData = {
    symbol: 'DEMO',
    name: '演示股票',
    date: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
    opens: [10, 10.5, 11, 11.5, 12],
    highs: [10.8, 11.2, 11.8, 12, 12.5],
    lows: [9.8, 10.2, 10.8, 11.2, 11.8],
    closes: [10.5, 11, 11.5, 12, 12.3],
    volumes: [1000, 1200, 1500, 1800, 2000]
  };

  // 直接运行公式
  const result = await runFormula('MA5: MA(C, 5); SIGNAL: IF(C > MA5, 1, 0)', data);

  if (result.success) {
    console.log('计算成功！');
    result.data?.forEach(item => {
      console.log(`${item.name}: ${item.values.join(', ')}`);
    });
    console.log(`执行时间: ${result.executionTime}ms`);
  } else {
    console.error('计算失败:', result.error);
  }
}

// 示例2：使用真实股票数据
async function example2_realStock() {
  console.log('\n=== 示例2：真实股票数据 ===\n');

  // 直接使用股票代码，无需关心数据获取细节
  const result = await runWithSymbol(
    'MA5: MA(C, 5); MA10: MA(C, 10); BREAKOUT: CROSS(C, MA5)',
    '1.600460', // 士兰微
    '20241101',
    '20241130'
  );

  if (result.success) {
    console.log('股票数据获取和计算成功！');
    result.data?.forEach(item => {
      const recentValues = item.values.slice(-5); // 显示最近5个值
      console.log(`${item.name} (最近5个): ${recentValues.map(v => v?.toFixed(2) || 'null').join(', ')}`);
    });
    console.log(`执行时间: ${result.executionTime}ms`);
    console.log(`是否使用Worker: ${result.workerUsed ? '是' : '否'}`);
  } else {
    console.error('失败:', result.error);
  }
}

// 示例3：批量股票分析
async function example3_batch() {
  console.log('\n=== 示例3：批量分析 ===\n');

  const symbols = ['1.600460', '0.000001', '1.000001']; // 士兰微、平安银行、深发展A
  
  // 启用Worker模式，提升大数据处理性能
  const result = await runBatchWithSymbols(
    'TREND: MA20: MA(C, 20); SIGNAL: CROSS(C, MA20)',
    symbols,
    '20241001',
    '20241231',
    {
      useWorker: true,  // 使用Worker线程
      enableProgress: true, // 启用进度报告
      onDataPoint: (current, total) => {
        console.log(`处理进度: ${current}/${total} (${Math.round(current/total*100)}%)`);
      }
    }
  );

  if (result.success && result.results) {
    console.log('\n批量计算完成！');
    
    // 按股票分组显示结果
    const stockResults: { [key: string]: any[] } = {};
    result.results.forEach(item => {
      if (!stockResults[item.symbol]) {
        stockResults[item.symbol] = [];
      }
      stockResults[item.symbol].push(item);
    });

    Object.entries(stockResults).forEach(([symbol, items]) => {
      console.log(`\n股票 ${symbol}:`);
      items.forEach(item => {
        const latest = item.values[item.values.length - 1];
        console.log(`  ${item.name}: ${latest?.toFixed(2) || 'null'}`);
      });
    });

    console.log(`\n总执行时间: ${result.executionTime}ms`);
    console.log(`使用Worker: ${result.workerUsed ? '是' : '否'}`);
    console.log(`处理股票数: ${symbols.length}`);
    console.log(`总指标数: ${result.results.length}`);
  } else {
    console.error('批量处理失败:', result.errors);
  }
}

// 示例4：自定义数据
async function example4_customData() {
  console.log('\n=== 示例4：自定义数据 ===\n');

  const customData: SimpleStockData = {
    symbol: 'CUSTOM',
    name: '自定义股票',
    date: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07'],
    opens: [100, 102, 101, 103, 105, 104, 106],
    highs: [105, 103, 104, 106, 108, 107, 109],
    lows: [99, 100, 99, 101, 103, 102, 104],
    closes: [102, 101, 103, 105, 104, 106, 108],
    volumes: [5000, 5200, 4800, 5500, 6000, 5800, 6200],
    // 自定义指标 - 会自动转换为可用的变量
    customRSI: [45, 48, 52, 55, 58, 62, 65],
    customMACD: [0.5, 0.8, 1.2, 1.5, 1.3, 1.7, 2.1]
  };

  // 在公式中使用自定义指标
  const result = await runFormula(`
    MA5: MA(C, 5);
    RSI_SIGNAL: IF(CUSTOMRSI > 50, 1, 0);
    MACD_TREND: IF(CUSTOMMACD > REF(CUSTOMMACD, 1), 1, -1);
    COMBINED: RSI_SIGNAL AND MACD_TREND
  `, customData);

  if (result.success) {
    console.log('自定义数据计算成功！');
    result.data?.forEach(item => {
      console.log(`${item.name}: ${item.values.join(', ')}`);
    });
  } else {
    console.error('失败:', result.error);
  }
}

// 示例5：高级Runner配置
async function example5_advanced() {
  console.log('\n=== 示例5：高级配置 ===\n');

  // 创建自定义Runner实例
  const runner = createRunner({
    useWorker: true,                    // 自动使用Worker
    workerCount: 4,                     // 使用4个Worker线程
    enableProgress: true,                // 启用进度报告
    onDataPoint: (current, total) => {   // 进度回调
      const percentage = Math.round(current / total * 100);
      if (percentage % 25 === 0 || current === total) {
        console.log(`  处理进度: ${current}/${total} (${percentage}%)`);
      }
    }
  });

  // 大数据集测试
  const symbols = ['1.600460', '0.000001', '1.000001', '0.300001', '1.600519'];
  const complexFormula = `
    MA5: MA(C, 5);
    MA10: MA(C, 10);
    MA20: MA(C, 20);
    VOL5: MA(V, 5);
    VOL10: MA(V, 10);
    UP_TREND: MA5 > MA10 AND MA10 > MA20;
    VOLUME_UP: V > VOL5;
    BUY_SIGNAL: UP_TREND AND VOLUME_UP;
    SELL_SIGNAL: MA5 < MA10 AND CROSS(MA10, MA5);
  `;

  const result = await runner.runBatchWithSymbols(
    complexFormula,
    symbols,
    '20241001',
    '20241130'
  );

  if (result.success && result.results) {
    console.log('\n高级计算完成！');
    
    // 统计信号
    const buySignals = result.results.filter(r => r.name === 'BUY_SIGNAL')
      .map(r => r.values.filter(v => v === 1).length);
    const sellSignals = result.results.filter(r => r.name === 'SELL_SIGNAL')
      .map(r => r.values.filter(v => v === 1).length);

    console.log(`买入信号总数: ${buySignals.reduce((a, b) => a + b, 0)}`);
    console.log(`卖出信号总数: ${sellSignals.reduce((a, b) => a + b, 0)}`);
    console.log(`执行时间: ${result.executionTime}ms`);
    console.log(`Worker线程数: 4`);
    console.log(`并行处理: ${result.workerUsed ? '是' : '否'}`);
  } else {
    console.error('高级计算失败:', result.errors);
  }
}

// 主函数
async function main() {
  try {
    await example1_basic();
    await example2_realStock();
    await example3_batch();
    await example4_customData();
    await example5_advanced();
    
    console.log('\n=== 所有示例执行完成 ===');
    
  } catch (error) {
    console.error('示例执行出错:', error);
    process.exit(1);
  }
}

// 运行示例
if (require.main === module) {
  main();
}

export {
  example1_basic,
  example2_realStock,
  example3_batch,
  example4_customData,
  example5_advanced
};