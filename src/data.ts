// 数据结构定义，对应Rust的data.ts
import { PlotStyle } from './ast';

export interface InputData {
  opens: number[];     // 开盘价序列
  highs: number[];     // 最高价序列
  lows: number[];      // 最低价序列
  closes: number[];    // 收盘价序列
  volumes: number[];   // 成交量序列
  numBars: number;     // 数据条数
}

export class InputDataBuilder {
  private opens: number[] = [];
  private highs: number[] = [];
  private lows: number[] = [];
  private closes: number[] = [];
  private volumes: number[] = [];

  addBar(open: number, high: number, low: number, close: number, volume: number): InputDataBuilder {
    this.opens.push(open);
    this.highs.push(high);
    this.lows.push(low);
    this.closes.push(close);
    this.volumes.push(volume);
    return this;
  }

  build(): InputData {
    const numBars = this.opens.length;
    
    if (this.highs.length !== numBars || 
        this.lows.length !== numBars || 
        this.closes.length !== numBars || 
        this.volumes.length !== numBars) {
      throw new Error('All data arrays must have the same length');
    }

    return {
      opens: this.opens,
      highs: this.highs,
      lows: this.lows,
      closes: this.closes,
      volumes: this.volumes,
      numBars,
    };
  }
}

export interface OutputLineResult {
  name: string;           // 输出线名称
  data: (number | null)[]; // 时间序列数据（允许空值）
  styles: PlotStyle[];    // 绘图样式
}

export interface FormulaResult {
  outputLines: OutputLineResult[]; // 输出线集合
}

// 构造函数
export function createOutputLineResult(
  name: string,
  data: (number | null)[] = [],
  styles: PlotStyle[] = []
): OutputLineResult {
  return {
    name,
    data,
    styles,
  };
}

export function createFormulaResult(outputLines: OutputLineResult[] = []): FormulaResult {
  return {
    outputLines,
  };
}

// 辅助函数：验证数据有效性
export function validateDataArray(data: (number | null)[], numBars: number): boolean {
  return data.length === numBars;
}

// 辅助函数：创建等长的空数组
export function createEmptyArray(length: number, fillValue: number | null = null): (number | null)[] {
  return new Array(length).fill(fillValue);
}

// 辅助函数：扩展单个数值为等长序列
export function expandNumberToArray(value: number, length: number): number[] {
  return new Array(length).fill(value);
}