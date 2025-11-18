// 公式执行器 - 简化接口，支持workerpool
import { createParser } from './parser';
import { InputData, InputDataBuilder } from './data';
import { createEvaluator } from './evaluator';
import { CustomStockData } from './custom-data-interface';
import { fetchStockData, fetchMultipleStockData } from './eastmoney-adapter';
import * as workerpool from 'workerpool';
import path from 'path';
import os from 'os';
import { cwd } from 'process';
import { DefaultFunctionRegistry, FunctionRegistry } from './function-registry';
import { integrateIndicatorsPackage } from './indicators-integration';

// 简化的输入数据接口
export interface SimpleStockData {
  symbol: string;
  name?: string;
  date: string[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
  // 自定义指标数据（避免与已知字段冲突）
  customIndicators?: {
    [key: string]: number[];
  };
}

// 执行结果接口
export interface RunResult {
  success: boolean;
  data?: Array<{
    name: string;
    values: (number | null)[];
  }>;
  error?: string;
  executionTime?: number;
  workerUsed?: boolean;
}

// 批量执行结果
export interface BatchRunResult {
  success: boolean;
  results?: Array<{
    symbol: string;
    name: string;
    values: (number | null)[];
  }>;
  errors?: string[];
  executionTime?: number;
  workerUsed?: boolean;
}

// Runner配置选项
export interface RunnerOptions {
  useWorker?: boolean; // 是否使用Worker模式
  workerCount?: number; // Worker数量，默认为CPU核心数
  enableProgress?: boolean; // 是否启用进度报告
}

// 主Runner类
export class FormulaRunner {
  private options: Required<RunnerOptions>;
  private pool?: workerpool.Pool;

  constructor(options: RunnerOptions = {}) {
    this.options = {
      useWorker: options.useWorker ?? false,
      workerCount: options.workerCount ?? os.cpus().length,
      enableProgress: options.enableProgress ?? false
    };

    if (this.options.useWorker) {
      this.initializePool();
    }
  }

  // 初始化Worker Pool
  private initializePool() {
    const workerPath = path.join(cwd(), 'src', 'formula-worker.js');
    this.pool = workerpool.pool(workerPath, {
      minWorkers: 1,
      maxWorkers: this.options.workerCount,
      workerType: 'thread',
      workerTerminateTimeout: 10 * 1000
    });
  }

  // 关闭Worker Pool
  async close() {
    if (this.pool) {
      await this.pool.terminate();
      this.pool = undefined;
    }
  }

  // 简化的执行接口 - 单股票数据
  async runFormula(formulaText: string, data: SimpleStockData): Promise<RunResult> {
    const startTime = Date.now();

    try {
      if (this.options.useWorker && this.shouldUseWorker(data)) {
        return await this.runInWorker(formulaText, data, startTime);
      } else {
        return await this.runInMainThread(formulaText, data, startTime);
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        workerUsed: false
      };
    }
  }

  // 批量股票数据执行
  async runBatchFormula(formulaText: string, dataList: SimpleStockData[]): Promise<BatchRunResult> {
    const startTime = Date.now();

    try {
      if (this.options.useWorker && dataList.length > 1) {
        return await this.runBatchInWorkers(formulaText, dataList, startTime);
      } else {
        return await this.runBatchInMainThread(formulaText, dataList, startTime);
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        executionTime,
        workerUsed: false
      };
    }
  }

  // 使用股票代码执行（从东方财富获取数据）
  async runWithSymbol(
    formulaText: string,
    symbol: string,
    startDate: string,
    endDate: string
  ): Promise<RunResult> {
    try {
      const stockData = await fetchStockData(symbol, startDate, endDate);
      const simpleData = this.convertToSimpleData(stockData);
      return await this.runFormula(formulaText, simpleData);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 批量股票代码执行
  async runBatchWithSymbols(
    formulaText: string,
    symbols: string[],
    startDate: string,
    endDate: string
  ): Promise<BatchRunResult> {
    try {
      const stockDataList = await fetchMultipleStockData(symbols, startDate, endDate);
      const simpleDataList = stockDataList.map((data) => this.convertToSimpleData(data));
      return await this.runBatchFormula(formulaText, simpleDataList);
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // 判断是否应该使用Worker
  private shouldUseWorker(data: SimpleStockData): boolean {
    const dataPoints = data.date.length;
    const estimatedOperations = dataPoints * 10; // 估算操作数
    return estimatedOperations > 10000; // 超过1万次操作使用Worker
  }

  // 主线程执行
  private async runInMainThread(
    formulaText: string,
    data: SimpleStockData,
    startTime: number,
    functionRegistry?: FunctionRegistry
  ): Promise<RunResult> {
    const inputData = this.createInputData(data);
    
    if (!functionRegistry) {
      functionRegistry = new DefaultFunctionRegistry();
      integrateIndicatorsPackage(functionRegistry);
    }
    const evaluator = createEvaluator(inputData, functionRegistry);

    const parser = createParser(formulaText);
    const formula = parser.parseFormula();
    const result = evaluator.evaluateFormula(formula);

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: result.outputLines.map((line) => ({
        name: line.name,
        values: line.data
      })),
      executionTime,
      workerUsed: false
    };
  }

  // Worker Pool执行
  private async runInWorker(
    formulaText: string,
    data: SimpleStockData,
    startTime: number
  ): Promise<RunResult> {
    if (!this.pool) {
      throw new Error('Worker pool not initialized');
    }

    try {
      const result = await this.pool.exec('processFormula', [formulaText, data, this.options]);
      return {
        ...result,
        executionTime: Date.now() - startTime,
        workerUsed: true
      };
    } catch (error) {
      throw new Error(
        `Worker execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // 主线程批量执行
  private async runBatchInMainThread(
    formulaText: string,
    dataList: SimpleStockData[],
    startTime: number
  ): Promise<BatchRunResult> {
    const results: Array<{
      symbol: string;
      name: string;
      values: (number | null)[];
    }> = [];

    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];

      // 进度回调暂时移除，避免Worker序列化问题

      const result = await this.runInMainThread(formulaText, data, Date.now());
      if (result.success && result.data) {
        result.data.forEach((output) => {
          results.push({
            symbol: data.symbol,
            name: output.name,
            values: output.values
          });
        });
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      results,
      executionTime,
      workerUsed: false
    };
  }

  // Worker Pool批量执行
  private async runBatchInWorkers(
    formulaText: string,
    dataList: SimpleStockData[],
    startTime: number
  ): Promise<BatchRunResult> {
    if (!this.pool) {
      throw new Error('Worker pool not initialized');
    }

    try {
      // 并行处理每个数据项
      const promises = dataList.map((data, index) =>
        this.pool!.exec('processFormula', [formulaText, data, this.options])
          .then((result: any) => ({
            success: true,
            data: result.data,
            dataIndex: index,
            symbol: data.symbol
          }))
          .catch((error: any) => ({
            success: false,
            data: null,
            error: error.message,
            dataIndex: index,
            symbol: data.symbol
          }))
      );

      const workerResults = await Promise.all(promises);
      const results: Array<{
        symbol: string;
        name: string;
        values: (number | null)[];
      }> = [];

      for (const workerResult of workerResults) {
        if (workerResult.success && workerResult.data) {
          workerResult.data.forEach((output: any) => {
            results.push({
              symbol: workerResult.symbol,
              name: output.name,
              values: output.values
            });
          });
        } else {
          console.log((workerResult as any).error);
        }
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        results,
        executionTime,
        workerUsed: true
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        executionTime: Date.now() - startTime,
        workerUsed: true
      };
    }
  }

  // 创建InputData
  private createInputData(data: SimpleStockData): InputData {
    const builder = new InputDataBuilder();

    for (let i = 0; i < data.date.length; i++) {
      builder.addBar(data.opens[i], data.highs[i], data.lows[i], data.closes[i], data.volumes[i]);
    }

    return builder.build();
  }

  // 转换CustomStockData到SimpleStockData
  private convertToSimpleData(stockData: CustomStockData): SimpleStockData {
    const { data, ...rest } = stockData;

    // 提取基础字段
    const simpleData: SimpleStockData = {
      symbol: stockData.symbol,
      name: stockData.name,
      date: data.date,
      opens: data.opens,
      highs: data.highs,
      lows: data.lows,
      closes: data.closes,
      volumes: data.volumes
    };

    // 提取自定义指标字段
    const customIndicators: { [key: string]: number[] } = {};
    Object.entries(data).forEach(([key, value]) => {
      if (!['date', 'opens', 'highs', 'lows', 'closes', 'volumes'].includes(key)) {
        if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
          customIndicators[key] = value;
        }
      }
    });

    // 只有存在自定义指标时才添加
    if (Object.keys(customIndicators).length > 0) {
      simpleData.customIndicators = customIndicators;
    }

    return simpleData;
  }
}

// 创建默认Runner实例
export function createRunner(options?: RunnerOptions): FormulaRunner {
  return new FormulaRunner(options);
}

// 便捷函数
export async function runFormula(
  formulaText: string,
  data: SimpleStockData,
  options?: RunnerOptions
): Promise<RunResult> {
  const runner = createRunner(options);
  try {
    return await runner.runFormula(formulaText, data);
  } finally {
    await runner.close();
  }
}

export async function runBatchFormula(
  formulaText: string,
  dataList: SimpleStockData[],
  options?: RunnerOptions
): Promise<BatchRunResult> {
  const runner = createRunner(options);
  try {
    return await runner.runBatchFormula(formulaText, dataList);
  } finally {
    await runner.close();
  }
}

export async function runWithSymbol(
  formulaText: string,
  symbol: string,
  startDate: string,
  endDate: string,
  options?: RunnerOptions
): Promise<RunResult> {
  const runner = createRunner(options);
  try {
    return await runner.runWithSymbol(formulaText, symbol, startDate, endDate);
  } finally {
    await runner.close();
  }
}

export async function runBatchWithSymbols(
  formulaText: string,
  symbols: string[],
  startDate: string,
  endDate: string,
  options?: RunnerOptions
): Promise<BatchRunResult> {
  const runner = createRunner(options);
  try {
    return await runner.runBatchWithSymbols(formulaText, symbols, startDate, endDate);
  } finally {
    await runner.close();
  }
}
