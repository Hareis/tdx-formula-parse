// 测试时间周期功能
const { TimeFrame, fetchStockData } = require('../dist/eastmoney-adapter.js');
const { runWithSymbol } = require('../dist/runner.js');

async function testTimeFrames() {
  console.log('🧪 测试不同时间周期的数据获取...\n');

  const symbol = '1.600460'; // 士兰微
  // 使用最近的数据，避免历史数据缺失问题
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10).replace(/-/g, '');
  const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, ''); // 最近7天
  const formula = 'MA5: MA(C, 5)';

  try {
    // 测试1分钟线
    console.log('📍 测试1分钟线...');
    const min1Result = await runWithSymbol(formula, symbol, startDate, endDate, TimeFrame.MIN_1);
    console.log(`✅ 1分钟线: 成功=${min1Result.success}, 数据量=${min1Result.data?.[0]?.values?.length}, Worker=${min1Result.workerUsed}`);
    
    // 测试5分钟线
    console.log('\n📍 测试5分钟线...');
    const min5Result = await runWithSymbol(formula, symbol, startDate, endDate, TimeFrame.MIN_5);
    console.log(`✅ 5分钟线: 成功=${min5Result.success}, 数据量=${min5Result.data?.[0]?.values?.length}, Worker=${min5Result.workerUsed}`);
    
    // 测试60分钟线
    console.log('\n📍 测试60分钟线...');
    const min60Result = await runWithSymbol(formula, symbol, startDate, endDate, TimeFrame.MIN_60);
    console.log(`✅ 60分钟线: 成功=${min60Result.success}, 数据量=${min60Result.data?.[0]?.values?.length}, Worker=${min60Result.workerUsed}`);
    
    // 测试日线（默认）
    console.log('\n📍 测试日线（默认）...');
    const dailyResult = await runWithSymbol(formula, symbol, startDate, endDate);
    console.log(`✅ 日线: 成功=${dailyResult.success}, 数据量=${dailyResult.data?.[0]?.values?.length}, Worker=${dailyResult.workerUsed}`);
    
    // 测试周线
    console.log('\n📍 测试周线...');
    const weeklyResult = await runWithSymbol(formula, symbol, startDate, endDate, TimeFrame.WEEKLY);
    console.log(`✅ 周线: 成功=${weeklyResult.success}, 数据量=${weeklyResult.data?.[0]?.values?.length}, Worker=${weeklyResult.workerUsed}`);
    
    // 显示数据对比
    console.log('\n📊 数据量对比:');
    console.log(`   1分钟: ${min1Result.data?.[0]?.values?.length || 0} 条`);
    console.log(`   5分钟: ${min5Result.data?.[0]?.values?.length || 0} 条`);
    console.log(`   60分钟: ${min60Result.data?.[0]?.values?.length || 0} 条`);
    console.log(`   日线:   ${dailyResult.data?.[0]?.values?.length || 0} 条`);
    console.log(`   周线:   ${weeklyResult.data?.[0]?.values?.length || 0} 条`);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 直接测试fetchStockData功能
async function testFetchTimeFrame() {
  console.log('\n🧪 直接测试fetchStockData时间周期功能...\n');

  const symbol = '1.600460';
  const startDate = '20241101';
  const endDate = '20241130';

  try {
    console.log('📍 获取5分钟K线数据...');
    const data = await fetchStockData(symbol, startDate, endDate, TimeFrame.MIN_5);
    console.log(`✅ 股票: ${data.name} (${data.symbol})`);
    console.log(`📅 时间周期: ${data.timeframe || '日线'}`);
    console.log(`📊 数据量: ${data.data.date.length} 条`);
    console.log(`💰 价格范围: ${Math.min(...data.data.closes)} - ${Math.max(...data.data.closes)}`);
    
    // 显示前几条数据
    console.log('\n📈 前5条数据:');
    for (let i = 0; i < Math.min(5, data.data.date.length); i++) {
      console.log(`   ${data.data.date[i]}: 开${data.data.opens[i]} 高${data.data.highs[i]} 低${data.data.lows[i]} 收${data.data.closes[i]} 量${data.data.volumes[i]}`);
    }

  } catch (error) {
    console.error('❌ 获取数据失败:', error.message);
  }
}

// 运行测试
async function runAllTests() {
  await testFetchTimeFrame();
  console.log('\n' + '='.repeat(60));
  await testTimeFrames();
}

runAllTests();
