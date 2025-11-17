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
import { FunctionRegistry, globalFunctionRegistry } from './function-registry';

type Environment = Map<string, (number | null)[]>;

export class Evaluator {
  private inputData: InputData;
  private environment: Environment;
  private outputLines: OutputLineResult[];
  private functionRegistry: FunctionRegistry;

  constructor(inputData: InputData, functionRegistry?: FunctionRegistry) {
    this.inputData = inputData;
    this.environment = new Map();
    this.outputLines = [];
    this.functionRegistry = functionRegistry || globalFunctionRegistry;
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
    
    // 从注册器中获取函数
    const func = this.functionRegistry.getFunction(name);
    if (!func) {
      throw new Error(`Unknown function: ${name}`);
    }
    
    return func(argValues);
  }

  // 获取数值参数（用于周期参数）
  private getNumberArg(argValues: (number | null)[]): number {
    if (argValues.length === 0) throw new Error('Missing numeric argument');
    const firstValue = argValues[0];
    if (firstValue === null) throw new Error('Numeric argument cannot be null');
    return firstValue;
  }
}

// 创建求值器实例
export function createEvaluator(inputData: InputData, functionRegistry?: FunctionRegistry): Evaluator {
  return new Evaluator(inputData, functionRegistry);
}
