// 东方财富数据与CustomDataEvaluator集成测试
import { readFile } from 'fs/promises';
import { createRunner } from '../../src/runner';
import path from 'path';

async function test1() {
  // 1. 从东方财富获取股票数据
  console.log('正在获取股票数据...');
  const symbol = '1.600460'; // 士兰微，上海交易所
  const startDate = '20240101';
  const endDate = '20241231';

  const formula = await getFormulaContent();
  const ma5Result = await createRunner().runWithSymbol(formula, symbol, startDate, endDate);

  console.log('ma5Result=', ma5Result);
}

async function getFormulaContent() {
  // 直接使用5日移动平均线的公式，避免变量引用问题
  const content = await readFile(path.join(__dirname, '指标.txt'));
  return content.toString('utf-8').replace(/;/g,'');
}

if (require.main === module) {
  test1()
    .then(() => {
      console.log('所有测试执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}
