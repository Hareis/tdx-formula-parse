// 简单的时间周期示例
const { TimeFrame, fetchStockData } = require('../dist/eastmoney-adapter.js');

async function demonstrateTimeFrames() {
  console.log('📈 股票时间周期演示\n');

  const symbol = '0.000001'; // 平安银行
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10).replace(/-/g, '');
  const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

  console.log(`股票代码: ${symbol}`);
  console.log(`时间范围: ${startDate} - ${endDate}\n`);

  try {
    // 5分钟K线
    console.log('📍 获取5分钟K线数据...');
    const min5Data = await fetchStockData(symbol, startDate, endDate, TimeFrame.MIN_5);
    console.log(`✅ 5分钟线: ${min5Data.data.date.length} 条数据`);
    console.log(`   最新价格: ${min5Data.data.closes[min5Data.data.closes.length - 1]}`);

    // 日线（默认）
    console.log('\n📍 获取日K线数据（默认）...');
    const dailyData = await fetchStockData(symbol, startDate, endDate);
    console.log(`✅ 日线: ${dailyData.data.date.length} 条数据`);
    console.log(`   最新价格: ${dailyData.data.closes[dailyData.data.closes.length - 1]}`);

    // 周线
    console.log('\n📍 获取周K线数据...');
    const weeklyData = await fetchStockData(symbol, startDate, endDate, TimeFrame.WEEKLY);
    console.log(`✅ 周线: ${weeklyData.data.date.length} 条数据`);
    console.log(`   最新价格: ${weeklyData.data.closes[weeklyData.data.closes.length - 1]}`);

    console.log('\n📊 数据量对比:');
    console.log(`   5分钟: ${min5Data.data.date.length} 条`);
    console.log(`   日线:   ${dailyData.data.date.length} 条`);
    console.log(`   周线:   ${weeklyData.data.date.length} 条`);

  } catch (error) {
    console.error('❌ 获取数据失败:', error.message);
  }
}

demonstrateTimeFrames();
