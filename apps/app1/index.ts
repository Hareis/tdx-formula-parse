// 东方财富数据与定时调度测试
import { readFile } from 'fs/promises';
import { createRunner } from '../../src/runner';
import * as schedule from 'node-schedule';
import path from 'path';
import { TimeFrame } from '../../dist/eastmoney-adapter';

const stockList=[
    '1.600530',
    '1.603116',
    '0.000037',
    '0.000815',
    '1.600031',
    '0.002507',
    '0.000333',
    '1.603777',
    '1.603155',
    '1.601139',
    '1.600703',
  ];
async function start() {
  // 1. 立即执行一次测试
  console.log('执行即时测试...');
  
  await runStockAnalysis(stockList);
}

async function getFormulaContent() {
  // 直接使用5日移动平均线的公式，避免变量引用问题
  const content = await readFile(path.join(__dirname, '指标.txt'));
  return content.toString('utf-8').replace(/;/g,'');
}

// 创建调度任务函数
function createScheduleTasks() {
  // 使用简化的 cron 表达式
  // 上午 9:00-11:30 每30分钟运行一次
  const morningJob = '0,30 9-11 * * 1-5';
  
  // 下午 13:00-15:00 每30分钟运行一次  
  const afternoonJob = '0,30 13-15 * * 1-5';

  const scheduledJobs: schedule.Job[] = [];
  const cronPatterns = [morningJob, afternoonJob];

  console.log(`正在设置 2 个简化定时任务...`);

  // 创建调度任务
  cronPatterns.forEach((cronPattern, index) => {
    const job = schedule.scheduleJob(cronPattern, async () => {
      const now = new Date();
      console.log(`[${now.toLocaleString()}] 执行定时股票分析任务`);
      
      try {
        await runStockAnalysis(stockList);
      } catch (error) {
        console.error(`[${now.toLocaleString()}] 定时任务执行失败:`, error);
      }
    });

    if (job) {
      scheduledJobs.push(job);
      console.log(`✓ 任务 #${index + 1} 已设置: ${cronPattern}`);
    }
  });

  return scheduledJobs;
}

// 股票分析任务
async function runStockAnalysis(symbols:string[]) {
  console.log('开始执行股票分析...');
  
  const startDate = '20240101';
  const endDate = '20241231';

  try {
    const formula = await getFormulaContent();
    const resultsRsp = await createRunner({
      useWorker:true,
    }).runBatchWithSymbols(formula, symbols, startDate, endDate, TimeFrame.MIN_30);
    
    const now = new Date();
    console.log(`[${now.toLocaleString()}] 股票分析完成:`);
    for (const result of resultsRsp.results!) {
      // 输出最近几个计算结果作为示例
      if (result?.values) {
        const values = result.values;
        const recentData = values.slice(-10);
        if (recentData.length > 0) {
          console.log(result.symbol+`: 【${result.name}】 最近10个有效值:`, recentData);
        }
      }
    }
    
  } catch (error) {
    console.error('股票分析失败:', error);
    throw error;
  }
}

async function startScheduler() {
  console.log('股票分析定时调度器启动');
  console.log('交易时间：工作日 9:00-11:30, 13:00-15:00');
  console.log('执行频率：每30分钟一次');
  console.log('当前时间:', new Date().toLocaleString());
  console.log('---');

  // 创建调度任务
  const scheduledJobs = createScheduleTasks();

  console.log(`✓ 定时调度器已启动，共设置 ${scheduledJobs.length} 个任务`);
  console.log('按 Ctrl+C 停止调度器');

  // 优雅关闭处理
  process.on('SIGINT', () => {
    console.log('\n正在停止所有定时任务...');
    scheduledJobs.forEach(job => job.cancel());
    console.log('所有任务已停止，程序退出');
    process.exit(0);
  });
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'schedule') {
    // 启动定时调度模式
    startScheduler()
      .catch((error) => {
        console.error('调度器启动失败:', error);
        process.exit(1);
      });
  } else {
    // 默认执行一次测试
    start()
      .then(() => {
        console.log('测试执行完成');
        process.exit(0);
      })
      .catch((error) => {
        console.error('测试失败:', error);
        process.exit(1);
      });
  }
}
