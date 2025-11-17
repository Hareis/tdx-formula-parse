// 求值器，对应Rust的evaluator.ts
import { 
  Expr, 
  Statement, 
  Formula, 
  UnaryOperator, 
  BinaryOperator,
  PlotStyle 
} from './ast';
import { InputData, OutputLineResult, FormulaResult, createOutputLineResult, createFormulaResult } from './data';

type Environment = Map<string, (number | null)[]>;

export class Evaluator {
  private inputData: InputData;
  private environment: Environment;
  private outputLines: OutputLineResult[];

  constructor(inputData: InputData) {
    this.inputData = inputData;
    this.environment = new Map();
    this.outputLines = [];
    this.initializeBuiltinVariables();
  }

  // 初始化内置变量
  private initializeBuiltinVariables(): void {
    this.environment.set('O', this.inputData.opens);
    this.environment.set('H', this.inputData.highs);
    this.environment.set('L', this.inputData.lows);
    this.environment.set('C', this.inputData.closes);
    this.environment.set('V', this.inputData.volumes);
  }

  // 主求值入口
  evaluateFormula(formula: Formula): FormulaResult {
    this.outputLines = [];

    for (const statement of formula.statements) {
      const result = this.executeStatement(statement);
      if (result) {
        this.outputLines.push(result);
      }
    }

    return createFormulaResult(this.outputLines);
  }

  // 执行单个语句
  private executeStatement(statement: Statement): OutputLineResult | null {
    switch (statement.type) {
      case 'Assignment':
        return this.executeAssignment(statement);
      case 'Output':
        return this.executeOutput(statement);
      default:
        throw new Error(`Unknown statement type: ${(statement as any).type}`);
    }
  }

  // 执行赋值语句
  private executeAssignment(statement: Statement & { type: 'Assignment' }): null {
    const value = this.evaluateExpr(statement.expr);
    this.environment.set(statement.variable, value);
    return null;
  }

  // 执行输出语句
  private executeOutput(statement: Statement & { type: 'Output' }): OutputLineResult {
    const data = this.evaluateExpr(statement.expr);
    const name = statement.name || `output_${this.outputLines.length + 1}`;
    
    return createOutputLineResult(name, data, statement.styles);
  }

  // 表达式求值（核心递归函数）
  private evaluateExpr(expr: Expr): (number | null)[] {
    switch (expr.type) {
      case 'Literal':
        return this.expandNumber(expr.numericValue);
      case 'Variable':
        return this.resolveVariable(expr.name);
      case 'UnaryOp':
        return this.evaluateUnaryOp(expr.operator, expr.operand);
      case 'BinaryOp':
        return this.evaluateBinaryOp(expr.left, expr.operator, expr.right);
      case 'FunctionCall':
        return this.evaluateFunctionCall(expr.name, expr.args);
      case 'Grouped':
        return this.evaluateExpr(expr.expr);
      default:
        throw new Error(`Unknown expression type: ${(expr as any).type}`);
    }
  }

  // 扩展数字为等长序列
  private expandNumber(value: number): number[] {
    return new Array(this.inputData.numBars).fill(value);
  }

  // 解析变量
  private resolveVariable(name: string): (number | null)[] {
    const value = this.environment.get(name);
    if (!value) {
      throw new Error(`Undefined variable: ${name}`);
    }
    return value;
  }

  // 一元运算符求值
  private evaluateUnaryOp(operator: UnaryOperator, operand: Expr): (number | null)[] {
    const operandValue = this.evaluateExpr(operand);
    
    return operandValue.map(value => {
      if (value === null) return null;
      
      switch (operator) {
        case UnaryOperator.Neg:
          return -value;
        case UnaryOperator.Not:
          return value === 0 ? 1 : 0; // 非零为真，零为假
        default:
          throw new Error(`Unknown unary operator: ${operator}`);
      }
    });
  }

  // 二元运算符求值
  private evaluateBinaryOp(left: Expr, operator: BinaryOperator, right: Expr): (number | null)[] {
    const leftValue = this.evaluateExpr(left);
    const rightValue = this.evaluateExpr(right);
    
    if (leftValue.length !== rightValue.length) {
      throw new Error('Binary operation requires arrays of same length');
    }
    
    return leftValue.map((leftVal, i) => {
      const rightVal = rightValue[i];
      
      if (leftVal === null || rightVal === null) {
        return null;
      }
      
      switch (operator) {
        // 算术运算
        case BinaryOperator.Add: return leftVal + rightVal;
        case BinaryOperator.Sub: return leftVal - rightVal;
        case BinaryOperator.Mul: return leftVal * rightVal;
        case BinaryOperator.Div: 
          if (rightVal === 0) return null;
          return leftVal / rightVal;
        
        // 比较运算
        case BinaryOperator.Gt: return leftVal > rightVal ? 1 : 0;
        case BinaryOperator.Lt: return leftVal < rightVal ? 1 : 0;
        case BinaryOperator.GtEq: return leftVal >= rightVal ? 1 : 0;
        case BinaryOperator.LtEq: return leftVal <= rightVal ? 1 : 0;
        case BinaryOperator.EqEq: return leftVal === rightVal ? 1 : 0;
        case BinaryOperator.NotEq: return leftVal !== rightVal ? 1 : 0;
        
        // 逻辑运算
        case BinaryOperator.And: 
          return (leftVal !== 0 && rightVal !== 0) ? 1 : 0;
        case BinaryOperator.Or:
          return (leftVal !== 0 || rightVal !== 0) ? 1 : 0;
        
        default:
          throw new Error(`Unknown binary operator: ${operator}`);
      }
    });
  }

  // 函数调用求值
  private evaluateFunctionCall(name: string, args: Expr[]): (number | null)[] {
    const argValues = args.map(arg => this.evaluateExpr(arg));
    
    // 检查所有参数长度一致
    const length = argValues[0]?.length || 0;
    for (const argValue of argValues) {
      if (argValue.length !== length) {
        throw new Error(`Function ${name} requires arguments of same length`);
      }
    }
    
    // 调用对应的内置函数
    switch (name.toUpperCase()) {
      case 'MA':
        return this.functionMA(argValues[0], this.getNumberArg(argValues[1]));
      case 'REF':
        return this.functionREF(argValues[0], this.getNumberArg(argValues[1]));
      case 'SUM':
        return this.functionSUM(argValues[0], this.getNumberArg(argValues[1]));
      case 'HHV':
        return this.functionHHV(argValues[0], this.getNumberArg(argValues[1]));
      case 'LLV':
        return this.functionLLV(argValues[0], this.getNumberArg(argValues[1]));
      case 'IF':
        return this.functionIF(argValues[0], argValues[1], argValues[2]);
      case 'CROSS':
        return this.functionCROSS(argValues[0], argValues[1]);
      case 'ABS':
        return this.functionABS(argValues[0]);
      case 'MAX':
        return this.functionMAX(argValues[0], argValues[1]);
      case 'MIN':
        return this.functionMIN(argValues[0], argValues[1]);
      case 'COUNT':
        return this.functionCOUNT(argValues[0], this.getNumberArg(argValues[1]));
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  // 获取数值参数（用于周期参数）
  private getNumberArg(argValues: (number | null)[]): number {
    if (argValues.length === 0) throw new Error('Missing numeric argument');
    const firstValue = argValues[0];
    if (firstValue === null) throw new Error('Numeric argument cannot be null');
    return firstValue;
  }

  // ===== 内置函数实现 =====

  // MA - 简单移动平均
  private functionMA(data: (number | null)[], period: number): (number | null)[] {
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
  }

  // REF - 向前引用
  private functionREF(data: (number | null)[], offset: number): (number | null)[] {
    if (offset < 0) throw new Error('REF offset must be non-negative');
    
    return data.map((value, i) => {
      const refIndex = i - offset;
      return refIndex >= 0 ? data[refIndex] : null;
    });
  }

  // SUM - 周期内求和
  private functionSUM(data: (number | null)[], period: number): (number | null)[] {
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
  }

  // HHV - 周期内最高值
  private functionHHV(data: (number | null)[], period: number): (number | null)[] {
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
  }

  // LLV - 周期内最低值
  private functionLLV(data: (number | null)[], period: number): (number | null)[] {
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
  }

  // IF - 条件判断
  private functionIF(
    condition: (number | null)[], 
    trueValue: (number | null)[], 
    falseValue: (number | null)[]
  ): (number | null)[] {
    return condition.map((cond, i) => {
      if (cond === null || trueValue[i] === null || falseValue[i] === null) {
        return null;
      }
      return cond !== 0 ? trueValue[i]! : falseValue[i]!;
    });
  }

  // CROSS - 交叉判断
  private functionCROSS(a: (number | null)[], b: (number | null)[]): (number | null)[] {
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
  }

  // ABS - 绝对值
  private functionABS(data: (number | null)[]): (number | null)[] {
    return data.map(value => value === null ? null : Math.abs(value));
  }

  // MAX - 最大值
  private functionMAX(a: (number | null)[], b: (number | null)[]): (number | null)[] {
    return a.map((valA, i) => {
      const valB = b[i];
      if (valA === null || valB === null) return null;
      return Math.max(valA, valB);
    });
  }

  // MIN - 最小值
  private functionMIN(a: (number | null)[], b: (number | null)[]): (number | null)[] {
    return a.map((valA, i) => {
      const valB = b[i];
      if (valA === null || valB === null) return null;
      return Math.min(valA, valB);
    });
  }

  // COUNT - 条件成立次数统计
  private functionCOUNT(condition: (number | null)[], period: number): (number | null)[] {
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
  }
}

// 创建求值器实例
export function createEvaluator(inputData: InputData): Evaluator {
  return new Evaluator(inputData);
}
