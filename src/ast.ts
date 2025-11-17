// 抽象语法树定义，对应Rust的ast.rs

export enum LiteralValue {
  Number = 'Number',
}

export enum UnaryOperator {
  Not = 'Not',  // 逻辑非
  Neg = 'Neg',  // 取负
}

export enum BinaryOperator {
  // 算术运算符
  Add = 'Add',    // +
  Sub = 'Sub',    // -
  Mul = 'Mul',    // *
  Div = 'Div',    // /
  
  // 比较运算符
  Gt = 'Gt',      // >
  Lt = 'Lt',      // <
  GtEq = 'GtEq',  // >=
  LtEq = 'LtEq',  // <=
  EqEq = 'Eq',      // ==
  NotEq = 'NotEq',// <>
  
  // 逻辑运算符
  And = 'And',    // AND
  Or = 'Or',      // OR
}

export type PlotStyle = string;

// 表达式类型
export type Expr = 
  | { type: 'Literal'; value: LiteralValue; numericValue: number }
  | { type: 'Variable'; name: string }
  | { type: 'UnaryOp'; operator: UnaryOperator; operand: Expr }
  | { type: 'BinaryOp'; left: Expr; operator: BinaryOperator; right: Expr }
  | { type: 'FunctionCall'; name: string; args: Expr[] }
  | { type: 'Grouped'; expr: Expr };

// 语句类型
export type Statement = 
  | { type: 'Assignment'; variable: string; expr: Expr }
  | { type: 'Output'; name: string | null; expr: Expr; styles: PlotStyle[] };

// 完整的公式
export interface Formula {
  statements: Statement[];
}

// 构造函数
export function createLiteralExpr(value: number): Expr {
  return {
    type: 'Literal',
    value: LiteralValue.Number,
    numericValue: value,
  };
}

export function createVariableExpr(name: string): Expr {
  return {
    type: 'Variable',
    name,
  };
}

export function createUnaryOpExpr(operator: UnaryOperator, operand: Expr): Expr {
  return {
    type: 'UnaryOp',
    operator,
    operand,
  };
}

export function createBinaryOpExpr(
  left: Expr,
  operator: BinaryOperator,
  right: Expr
): Expr {
  return {
    type: 'BinaryOp',
    left,
    operator,
    right,
  };
}

export function createFunctionCallExpr(name: string, args: Expr[]): Expr {
  return {
    type: 'FunctionCall',
    name,
    args,
  };
}

export function createGroupedExpr(expr: Expr): Expr {
  return {
    type: 'Grouped',
    expr,
  };
}

export function createAssignmentStatement(variable: string, expr: Expr): Statement {
  return {
    type: 'Assignment',
    variable,
    expr,
  };
}

export function createOutputStatement(
  name: string | null,
  expr: Expr,
  styles: PlotStyle[] = []
): Statement {
  return {
    type: 'Output',
    name,
    expr,
    styles,
  };
}

export function createFormula(statements: Statement[]): Formula {
  return {
    statements,
  };
}
