
export type FunctionType = (args: (number | null)[][]) => (number | null)[];

export interface FunctionRegistry {
  registerFunction(name: string, func: FunctionType): void;
  unregisterFunction(name: string): boolean;
  getFunction(name: string): FunctionType | undefined;
  getAllFunctionNames(): string[];
  hasFunction(name: string): boolean;
}

export class DefaultFunctionRegistry implements FunctionRegistry {
  private functions: Map<string, FunctionType> = new Map();
  
  constructor() {
    this.initializeBuiltinFunctions();
  }

  // 注册函数
  registerFunction(name: string, func: FunctionType): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Function name must be a non-empty string');
    }
    
    if (typeof func !== 'function') {
      throw new Error('Function implementation must be a function');
    }
    
    const upperName = name.toUpperCase();
    this.functions.set(upperName, func);
  }

  // 注销函数
  unregisterFunction(name: string): boolean {
    const upperName = name.toUpperCase();
    return this.functions.delete(upperName);
  }

  // 获取函数
  getFunction(name: string): FunctionType | undefined {
    const upperName = name.toUpperCase();
    return this.functions.get(upperName);
  }

  // 获取所有函数名
  getAllFunctionNames(): string[] {
    return Array.from(this.functions.keys());
  }

  // 检查函数是否存在
  hasFunction(name: string): boolean {
    const upperName = name.toUpperCase();
    return this.functions.has(upperName);
  }

  // 初始化内置函数
  private initializeBuiltinFunctions(): void {
    // 移动平均函数
    this.registerFunction('MA', (args) => {
      const [data, periodArg] = args;
      const period = this.getNumberArg(periodArg);
      
      const result: (number | null)[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
          continue;
        }
        
        let sum = 0;
        let count = 0;
        
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j] !== null) {
            sum += data[j]!;
            count++;
          }
        }
        
        result.push(count > 0 ? sum / count : null);
      }
      
      return result;
    });

    // 向前引用函数
    this.registerFunction('REF', (args) => {
      const [data, offsetArg] = args;
      const offset = this.getNumberArg(offsetArg);
      
      if (offset < 0) throw new Error('REF offset must be non-negative');
      
      return data.map((value, i) => {
        const refIndex = i - offset;
        return refIndex >= 0 ? data[refIndex] : null;
      });
    });

    // 周期求和函数
    this.registerFunction('SUM', (args) => {
      const [data, periodArg] = args;
      const period = this.getNumberArg(periodArg);
      
      const result: (number | null)[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
          continue;
        }
        
        let sum = 0;
        let hasValidData = false;
        
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j] !== null) {
            sum += data[j]!;
            hasValidData = true;
          }
        }
        
        result.push(hasValidData ? sum : null);
      }
      
      return result;
    });

    // 最高值函数
    this.registerFunction('HHV', (args) => {
      const [data, periodArg] = args;
      const period = this.getNumberArg(periodArg);
      
      const result: (number | null)[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
          continue;
        }
        
        let maxVal: number | null = null;
        
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j] !== null) {
            if (maxVal === null || data[j]! > maxVal) {
              maxVal = data[j]!;
            }
          }
        }
        
        result.push(maxVal);
      }
      
      return result;
    });

    // 最低值函数
    this.registerFunction('LLV', (args) => {
      const [data, periodArg] = args;
      const period = this.getNumberArg(periodArg);
      
      const result: (number | null)[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
          continue;
        }
        
        let minVal: number | null = null;
        
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j] !== null) {
            if (minVal === null || data[j]! < minVal) {
              minVal = data[j]!;
            }
          }
        }
        
        result.push(minVal);
      }
      
      return result;
    });

    // 条件判断函数
    this.registerFunction('IF', (args) => {
      const [condition, trueValue, falseValue] = args;
      
      return condition.map((cond, i) => {
        if (cond === null || trueValue[i] === null || falseValue[i] === null) {
          return null;
        }
        return cond !== 0 ? trueValue[i]! : falseValue[i]!;
      });
    });

    // 交叉判断函数
    this.registerFunction('CROSS', (args) => {
      const [a, b] = args;
      
      const result: (number | null)[] = [];
      
      for (let i = 0; i < a.length; i++) {
        if (i === 0 || a[i] === null || b[i] === null || a[i-1] === null || b[i-1] === null) {
          result.push(0);
          continue;
        }
        
        // 判断是否发生交叉：a从下向上穿过b
        const cross = (a[i-1]! < b[i-1]!) && (a[i]! > b[i]!);
        result.push(cross ? 1 : 0);
      }
      
      return result;
    });

    // 绝对值函数
    this.registerFunction('ABS', (args) => {
      const [data] = args;
      return data.map(value => value === null ? null : Math.abs(value));
    });

    // 最大值函数
    this.registerFunction('MAX', (args) => {
      const [a, b] = args;
      return a.map((valA, i) => {
        const valB = b[i];
        if (valA === null || valB === null) return null;
        return Math.max(valA, valB);
      });
    });

    // 最小值函数
    this.registerFunction('MIN', (args) => {
      const [a, b] = args;
      return a.map((valA, i) => {
        const valB = b[i];
        if (valA === null || valB === null) return null;
        return Math.min(valA, valB);
      });
    });

    // 计数函数
    this.registerFunction('COUNT', (args) => {
      const [condition, periodArg] = args;
      const period = this.getNumberArg(periodArg);
      
      const result: (number | null)[] = [];
      
      for (let i = 0; i < condition.length; i++) {
        if (i < period - 1) {
          result.push(null);
          continue;
        }
        
        let count = 0;
        
        for (let j = i - period + 1; j <= i; j++) {
          if (condition[j] !== null && condition[j]! !== 0) {
            count++;
          }
        }
        
        result.push(count);
      }
      
      return result;
    });

    // 标准差函数 - 新增示例
    this.registerFunction('STD', (args) => {
      const [data, periodArg] = args;
      const period = this.getNumberArg(periodArg);
      
      const result: (number | null)[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
          continue;
        }
        
        // 计算平均值
        let sum = 0;
        let count = 0;
        
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j] !== null) {
            sum += data[j]!;
            count++;
          }
        }
        
        if (count === 0) {
          result.push(null);
          continue;
        }
        
        const mean = sum / count;
        
        // 计算方差
        let variance = 0;
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j] !== null) {
            variance += Math.pow(data[j]! - mean, 2);
          }
        }
        
        // 计算标准差
        const stdDev = Math.sqrt(variance / count);
        result.push(stdDev);
      }
      
      return result;
    });

    // 变异系数函数 - 新增示例
    this.registerFunction('CV', (args) => {
      const [data, periodArg] = args;
      const period = this.getNumberArg(periodArg);
      
      const result: (number | null)[] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result.push(null);
          continue;
        }
        
        // 计算平均值
        let sum = 0;
        let count = 0;
        
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j] !== null) {
            sum += data[j]!;
            count++;
          }
        }
        
        if (count === 0 || sum === 0) {
          result.push(null);
          continue;
        }
        
        const mean = sum / count;
        
        // 计算标准差
        let variance = 0;
        for (let j = i - period + 1; j <= i; j++) {
          if (data[j] !== null) {
            variance += Math.pow(data[j]! - mean, 2);
          }
        }
        
        const stdDev = Math.sqrt(variance / count);
        
        // 计算变异系数 = 标准差 / 平均值
        const cv = stdDev / mean;
        result.push(cv);
      }
      
      return result;
    });
  }

  // 获取数值参数（用于周期参数）
  private getNumberArg(argValues: (number | null)[]): number {
    if (argValues.length === 0) throw new Error('Missing numeric argument');
    const firstValue = argValues[0];
    if (firstValue === null) throw new Error('Numeric argument cannot be null');
    return firstValue;
  }
}

// 创建全局函数注册器实例
export const globalFunctionRegistry = new DefaultFunctionRegistry();
