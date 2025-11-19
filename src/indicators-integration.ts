// @ixjb94/indicators 包集成模块 - 使用内置的同步方法
import { IndicatorsSync } from '@ixjb94/indicators';
import { FunctionRegistry } from './function-registry';

// 创建 Indicators 实例
const indicators = new IndicatorsSync();

/**
 * 将 @ixjb94/indicators 包的所有函数集成到函数注册器中
 * 使用包内置的同步计算方法，避免重复实现
 */
export function integrateIndicatorsPackage(functionRegistry: FunctionRegistry): void {
  // 数据适配器 - 将我们的数据转换为指标包需要的格式
  function adaptData(data: (number | null)[]): number[] {
    return data.map((value) => (value === null ? 0 : value));
  }

  // 结果适配器 - 将指标包的结果转换为我们的格式（处理一维数组）
  function adaptResult(result: number[], originalLength: number): (number | null)[] {
    const adapted: (number | null)[] = [];

    // 指标包的结果通常比原始数据短，需要填充前面的null值
    const diff = originalLength - result.length;
    for (let i = 0; i < diff; i++) {
      adapted.push(null);
    }

    // 添加有效结果
    for (const value of result) {
      adapted.push(value === 0 || isNaN(value) ? null : value);
    }

    return adapted;
  }

  // 多维结果适配器 - 处理返回二维数组的函数（如MACD、BBANDS等）
  function adaptMultiResult(
    result: number[][],
    originalLength: number,
    lineIndex: number = 0
  ): (number | null)[] {
    const adapted: (number | null)[] = [];

    if (result.length === 0 || result[lineIndex].length === 0) {
      return new Array(originalLength).fill(null);
    }

    // 指标包的结果通常比原始数据短，需要填充前面的null值
    const diff = originalLength - result[lineIndex].length;
    for (let i = 0; i < diff; i++) {
      adapted.push(null);
    }

    // 添加有效结果
    for (const value of result[lineIndex]) {
      adapted.push(value === 0 || isNaN(value) ? null : value);
    }

    return adapted;
  }

  // 注册主要技术指标函数

  // 简单移动平均
  functionRegistry.registerFunction('SMA', (args) => {
    const [dataArg, periodArg] = args;
    const data = adaptData(dataArg);
    const period = periodArg[0] || 20;

    try {
      const result = indicators.sma(data, period);
      return adaptResult(result, dataArg.length);
    } catch (error) {
      console.error('SMA计算错误:', error);
      return dataArg.map(() => null);
    }
  });

  // 指数移动平均
  functionRegistry.registerFunction('EMA', (args) => {
    const [dataArg, periodArg] = args;
    const data = adaptData(dataArg);
    const period = periodArg[0] || 12;

    try {
      const result = indicators.ema(data, period);
      return adaptResult(result, dataArg.length);
    } catch (error) {
      console.error('EMA计算错误:', error);
      return dataArg.map(() => null);
    }
  });

  // 相对强弱指标
  functionRegistry.registerFunction('RSI', (args) => {
    const [dataArg, periodArg] = args;
    const data = adaptData(dataArg);
    const period = periodArg[0] || 14;

    try {
      const result = indicators.rsi(data, period);
      return adaptResult(result, dataArg.length);
    } catch (error) {
      console.error('RSI计算错误:', error);
      return dataArg.map(() => null);
    }
  });

  // MACD指标
  functionRegistry.registerFunction('MACD', (args) => {
    const [dataArg, fastArg, slowArg, signalArg] = args;
    const data = adaptData(dataArg);
    const fastPeriod = fastArg[0] || 12;
    const slowPeriod = slowArg[0] || 26;
    const signalPeriod = signalArg[0] || 9;

    try {
      // MACD函数返回包含[MACD线, 信号线, 柱状图]的三维数组
      const result = indicators.macd(data, fastPeriod, slowPeriod, signalPeriod);
      // 这里我们只返回MACD线（索引0）
      return adaptMultiResult(result, dataArg.length, 0);
    } catch (error) {
      console.error('MACD计算错误:', error);
      return dataArg.map(() => null);
    }
  });

  // 布林带指标
  functionRegistry.registerFunction('BBANDS', (args) => {
    const [dataArg, periodArg, stdDevArg] = args;
    const data = adaptData(dataArg);
    const period = periodArg[0] || 20;
    const stdDev = stdDevArg[0] || 2;

    try {
      // 布林带返回[上轨, 中轨, 下轨]的三维数组
      const result = indicators.bbands(data, period, stdDev);
      // 这里我们只返回中间线（索引1）
      return adaptMultiResult(result, dataArg.length, 1);
    } catch (error) {
      console.error('BBANDS计算错误:', error);
      return dataArg.map(() => null);
    }
  });

  // 动量指标
  functionRegistry.registerFunction('MOM', (args) => {
    const [dataArg, periodArg] = args;
    const data = adaptData(dataArg);
    const period = periodArg[0] || 10;

    try {
      const result = indicators.mom(data, period);
      return adaptResult(result, dataArg.length);
    } catch (error) {
      console.error('MOM计算错误:', error);
      return dataArg.map(() => null);
    }
  });

  // 随机指标
  functionRegistry.registerFunction('STOCH', (args) => {
    const [highArg, lowArg, closeArg, kPeriodArg, dPeriodArg] = args;
    const high = adaptData(highArg);
    const low = adaptData(lowArg);
    const close = adaptData(closeArg);
    const kPeriod = kPeriodArg[0] || 14;
    const dPeriod = dPeriodArg[0] || 3;

    try {
      // STOCH函数需要6个参数：high, low, close, kPeriod, dPeriod, slowKPeriod
      // 这里我们使用dPeriod作为slowKPeriod
      const result = indicators.stoch(high, low, close, kPeriod, dPeriod, dPeriod);
      return adaptMultiResult(result, closeArg.length, 0); // 返回K值
    } catch (error) {
      console.error('STOCH计算错误:', error);
      return closeArg.map(() => null);
    }
  });

  // 商品通道指标
  functionRegistry.registerFunction('CCI', (args) => {
    const [highArg, lowArg, closeArg, periodArg] = args;
    const high = adaptData(highArg);
    const low = adaptData(lowArg);
    const close = adaptData(closeArg);
    const period = periodArg[0] || 20;

    try {
      const result = indicators.cci(high, low, close, period);
      return adaptResult(result, closeArg.length);
    } catch (error) {
      console.error('CCI计算错误:', error);
      return closeArg.map(() => null);
    }
  });

  // 威廉指标
  functionRegistry.registerFunction('WILLR', (args) => {
    const [highArg, lowArg, closeArg, periodArg] = args;
    const high = adaptData(highArg);
    const low = adaptData(lowArg);
    const close = adaptData(closeArg);
    const period = periodArg[0] || 14;

    try {
      const result = indicators.willr(high, low, close, period);
      return adaptResult(result, closeArg.length);
    } catch (error) {
      console.error('WILLR计算错误:', error);
      return closeArg.map(() => null);
    }
  });

  // 平均真实范围
  functionRegistry.registerFunction('ATR', (args) => {
    const [highArg, lowArg, closeArg, periodArg] = args;
    const high = adaptData(highArg);
    const low = adaptData(lowArg);
    const close = adaptData(closeArg);
    const period = periodArg[0] || 14;

    try {
      const result = indicators.atr(high, low, close, period);
      return adaptResult(result, closeArg.length);
    } catch (error) {
      console.error('ATR计算错误:', error);
      return closeArg.map(() => null);
    }
  });

  // 成交量移动平均
  functionRegistry.registerFunction('VWMA', (args) => {
    const [closeArg, volumeArg, periodArg] = args;
    const close = adaptData(closeArg);
    const volume = adaptData(volumeArg);
    const period = periodArg[0] || 20;

    try {
      const result = indicators.vwma(close, volume, period);
      return adaptResult(result, closeArg.length);
    } catch (error) {
      console.error('VWMA计算错误:', error);
      return closeArg.map(() => null);
    }
  });

  // 顺势指标
  functionRegistry.registerFunction('ADX', (args) => {
    const [highArg, lowArg, closeArg, periodArg] = args;
    const high = adaptData(highArg);
    const low = adaptData(lowArg);
    const close = adaptData(closeArg);
    const period = periodArg[0] || 14;

    try {
      const result = indicators.adx(high, low, period);
      return adaptResult(result, closeArg.length);
    } catch (error) {
      console.error('ADX计算错误:', error);
      return closeArg.map(() => null);
    }
  });

  // 能量潮指标
  functionRegistry.registerFunction('OBV', (args) => {
    const [closeArg, volumeArg] = args;
    const close = adaptData(closeArg);
    const volume = adaptData(volumeArg);

    try {
      const result = indicators.obv(close, volume);
      return adaptResult(result, closeArg.length);
    } catch (error) {
      console.error('OBV计算错误:', error);
      return closeArg.map(() => null);
    }
  });

  // 价格变动率
  functionRegistry.registerFunction('ROC', (args) => {
    const [dataArg, periodArg] = args;
    const data = adaptData(dataArg);
    const period = periodArg[0] || 12;

    try {
      const result = indicators.roc(data, period);
      return adaptResult(result, dataArg.length);
    } catch (error) {
      console.error('ROC计算错误:', error);
      return dataArg.map(() => null);
    }
  });

  // 价格变动率
  functionRegistry.registerFunction('CROSSOVER', (args) => {
    const [dataArg1, dataArg2] = args;
    const data1 = adaptData(dataArg1);
    const data2 = adaptData(dataArg2);

    try {
      const result = indicators.crossany(data1, data2);
      return adaptResult(result.map((e) => (e ? 1 : 0)),data1.length);
    } catch (error) {
      console.error('CROSSOVER计算错误:', error);
      return dataArg1.map(() => null);
    }
  });

  console.log(
    '📊 可用的技术指标函数: SMA, EMA, RSI, MACD, BBANDS, MOM, STOCH, CCI, WILLR, ATR, VWMA, ADX, OBV, ROC, CROSSOVER'
  );
}
