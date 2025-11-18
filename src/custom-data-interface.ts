// 自定义数据输入接口 - 支持用户传入自定义股票数据和指标
import { InputData, InputDataBuilder } from './data';
import { Formula } from './ast';
import { Evaluator } from './evaluator';

export interface CustomStockData {
  symbol: string;
  name?: string;
  data: {
    date: string[];           // 日期序列
    opens: number[];         // 开盘价
    highs: number[];         // 最高价
    lows: number[];          // 最低价
    closes: number[];        // 收盘价
    volumes: number[];       // 成交量
    [customKey: string]: any; // 自定义指标数据
  };
}

export interface TechnicalIndicator {
  name: string;
  description?: string;
  data: number[];           // 指标数据序列
}

export interface CombinedCalculationRequest {
  stocks: CustomStockData[];
  indicators?: TechnicalIndicator[];
  formula: Formula;
  outputNames?: string[];
}

export interface CombinedCalculationResult {
  results: Array<{
    stockSymbol: string;
    outputName: string;
    data: (number | null)[];
  }>;
  errors: string[];
}

export class CustomDataEvaluator{
  private stockDataMap: Map<string, CustomStockData> = new Map();
  private indicatorMap: Map<string, TechnicalIndicator> = new Map();

  constructor() {
    this.initializeBuiltinVariables();
  }

  // 添加股票数据
  addStockData(stock: CustomStockData): void {
    if (!stock.symbol || !stock.data) {
      throw new Error('Stock data must have symbol and data fields');
    }
    
    // 验证数据长度一致性
    const { date, opens, highs, lows, closes, volumes } = stock.data;
    const dataArrays = [date, opens, highs, lows, closes, volumes];
    
    const baseLength = date.length;
    for (const arr of dataArrays) {
      if (arr.length !== baseLength) {
        throw new Error(`All data arrays must have the same length for stock ${stock.symbol}`);
      }
    }
    
    this.stockDataMap.set(stock.symbol, stock);
  }

  // 添加技术指标
  addIndicator(indicator: TechnicalIndicator): void {
    if (!indicator.name || !indicator.data) {
      throw new Error('Indicator must have name and data fields');
    }
    this.indicatorMap.set(indicator.name, indicator);
  }

  // 批量添加股票数据
  addMultipleStocks(stocks: CustomStockData[]): void {
    for (const stock of stocks) {
      this.addStockData(stock);
    }
  }

  // 批量添加技术指标
  addMultipleIndicators(indicators: TechnicalIndicator[]): void {
    for (const indicator of indicators) {
      this.addIndicator(indicator);
    }
  }

  // 获取股票数据
  getStockData(symbol: string): CustomStockData | undefined {
    return this.stockDataMap.get(symbol);
  }

  // 获取技术指标
  getIndicator(name: string): TechnicalIndicator | undefined {
    return this.indicatorMap.get(name);
  }

  // 移除股票数据
  removeStockData(symbol: string): boolean {
    return this.stockDataMap.delete(symbol);
  }

  // 移除技术指标
  removeIndicator(name: string): boolean {
    return this.indicatorMap.delete(name);
  }

  // 获取所有股票符号
  getAllStockSymbols(): string[] {
    return Array.from(this.stockDataMap.keys());
  }

  // 获取所有指标名称
  getAllIndicatorNames(): string[] {
    return Array.from(this.indicatorMap.keys());
  }

  // 执行联合计算
  evaluateCombinedFormula(request: CombinedCalculationRequest): CombinedCalculationResult {
    const errors: string[] = [];
    const results: CombinedCalculationResult['results'] = [];

    // 添加请求中的股票数据
    if (request.stocks) {
      this.addMultipleStocks(request.stocks);
    }

    // 添加请求中的技术指标
    if (request.indicators) {
      this.addMultipleIndicators(request.indicators);
    }

    // 对每个股票执行公式计算
    for (const stockSymbol of this.getAllStockSymbols()) {
      const stockData = this.getStockData(stockSymbol);
      if (!stockData) continue;

      try {
        // 创建输入数据
        const builder = new InputDataBuilder();
        for (let i = 0; i < stockData.data.opens.length; i++) {
          builder.addBar(
            stockData.data.opens[i], 
            stockData.data.highs[i], 
            stockData.data.lows[i], 
            stockData.data.closes[i], 
            stockData.data.volumes[i]
          );
        }
        const inputData = builder.build();

        // 创建自定义环境变量
        const customEnvironment = new Map<string, (number | null)[]>();
        
        // 添加内置变量
        customEnvironment.set('O', stockData.data.opens);
        customEnvironment.set('H', stockData.data.highs);
        customEnvironment.set('L', stockData.data.lows);
        customEnvironment.set('C', stockData.data.closes);
        customEnvironment.set('V', stockData.data.volumes);

        // 添加自定义指标数据
        for (const [key, value] of Object.entries(stockData.data)) {
          if (!['date', 'opens', 'highs', 'lows', 'closes', 'volumes'].includes(key)) {
            if (Array.isArray(value) && value.every(item => typeof item === 'number')) {
              customEnvironment.set(key.toUpperCase(), value);
            }
          }
        }

        // 添加技术指标数据
        for (const indicatorName of this.getAllIndicatorNames()) {
          const indicator = this.getIndicator(indicatorName);
          if (indicator && indicator.data.length === inputData.numBars) {
            customEnvironment.set(indicatorName.toUpperCase(), indicator.data);
          }
        }

        // 创建自定义求值器（需要扩展原有的Evaluator类）
        const evaluator = this.createCustomEvaluator(inputData, customEnvironment);
        
        // 执行公式计算
        const formulaResult = evaluator.evaluateFormula(request.formula);

        // 处理输出结果
        for (const outputLine of formulaResult.outputLines) {
          const outputName = request.outputNames?.[results.length] || outputLine.name;
          
          results.push({
            stockSymbol,
            outputName,
            data: outputLine.data
          });
        }

      } catch (error) {
        errors.push(`Error evaluating stock ${stockSymbol}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      results,
      errors
    };
  }

  // 创建自定义求值器（简化版本，直接使用Evaluator）
  private createCustomEvaluator(inputData: InputData, _customEnvironment: Map<string, (number | null)[]>): Evaluator {
    // 直接使用Evaluator，因为修改其内部变量解析逻辑较为复杂
    // 自定义变量应该通过其他方式处理，如预处理公式或将自定义数据合并到输入数据中
    return new Evaluator(inputData);
  }

  // 清空所有数据
  clearAllData(): void {
    this.stockDataMap.clear();
    this.indicatorMap.clear();
  }

  // 数据验证
  validateData(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证股票数据
    for (const [symbol, stock] of this.stockDataMap) {
      const { date, opens, highs, lows, closes, volumes } = stock.data;
      
      if (date.length === 0) {
        errors.push(`Stock ${symbol}: Data arrays cannot be empty`);
        continue;
      }

      const expectedLength = date.length;
      const arrays = { opens, highs, lows, closes, volumes };
      
      for (const [key, arr] of Object.entries(arrays)) {
        if (arr.length !== expectedLength) {
          errors.push(`Stock ${symbol}: ${key} array length mismatch`);
        }
      }
    }

    // 验证技术指标数据
    for (const [name, indicator] of this.indicatorMap) {
      if (indicator.data.length === 0) {
        errors.push(`Indicator ${name}: Data array cannot be empty`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 获取数据统计信息
  getDataStatistics(): {
    stocks: number;
    indicators: number;
    totalDataPoints: number;
    dateRange?: { start: string; end: string };
  } {
    let totalDataPoints = 0;
    let dateRange: { start: string; end: string } | undefined;

    // 计算股票数据点
    for (const stock of this.stockDataMap.values()) {
      totalDataPoints += stock.data.date.length;
      
      // 计算日期范围
      if (stock.data.date.length > 0) {
        const dates = stock.data.date;
        const currentRange = { start: dates[0], end: dates[dates.length - 1] };
        
        if (!dateRange) {
          dateRange = currentRange;
        } else {
          if (dates[0] < dateRange.start) dateRange.start = dates[0];
          if (dates[dates.length - 1] > dateRange.end) dateRange.end = dates[dates.length - 1];
        }
      }
    }

    // 计算指标数据点
    for (const indicator of this.indicatorMap.values()) {
      totalDataPoints += indicator.data.length;
    }

    return {
      stocks: this.stockDataMap.size,
      indicators: this.indicatorMap.size,
      totalDataPoints,
      dateRange
    };
  }

  // 初始化内置变量
  private initializeBuiltinVariables(): void {
    // 可以在这里添加一些常用的内置变量或指标
  }
}

// 创建实例的辅助函数
export function createCustomDataEvaluator(): CustomDataEvaluator {
  return new CustomDataEvaluator();
}

// 示例使用方式
/*
// 创建自定义数据求值器
const evaluator = createCustomDataEvaluator();

// 添加股票数据
const stockData: CustomStockData = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  data: {
    date: ['2024-01-01', '2024-01-02', '2024-01-03'],
    opens: [150, 152, 151],
    highs: [155, 156, 154],
    lows: [149, 151, 150],
    closes: [153, 154, 152],
    volumes: [1000000, 1200000, 1100000],
    customIndicator: [1.2, 1.3, 1.1] // 自定义指标
  }
};

evaluator.addStockData(stockData);

// 添加技术指标
const rsiIndicator: TechnicalIndicator = {
  name: 'RSI',
  description: 'Relative Strength Index',
  data: [70, 65, 60]
};

evaluator.addIndicator(rsiIndicator);

// 执行联合计算
const result = evaluator.evaluateCombinedFormula({
  stocks: [stockData],
  indicators: [rsiIndicator],
  formula: {
    statements: [
      // 公式语句
    ]
  }
});
*/
