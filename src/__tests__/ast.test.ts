import {
  createLiteralExpr,
  createVariableExpr,
  createUnaryOpExpr,
  createBinaryOpExpr,
  createFunctionCallExpr,
  createGroupedExpr,
  createAssignmentStatement,
  createOutputStatement,
  createFormula,
  UnaryOperator,
  BinaryOperator,
} from '../ast';

describe('AST', () => {
  test('should create literal expression', () => {
    const expr = createLiteralExpr(42);
    
    expect(expr.type).toBe('Literal');
    if (expr.type === 'Literal') {
      expect(expr.numericValue).toBe(42);
    }
  });

  test('should create variable expression', () => {
    const expr = createVariableExpr('C');
    
    expect(expr.type).toBe('Variable');
    if (expr.type === 'Variable') {
      expect(expr.name).toBe('C');
    }
  });

  test('should create unary operator expression', () => {
    const innerExpr = createLiteralExpr(10);
    const expr = createUnaryOpExpr(UnaryOperator.Neg, innerExpr);
    
    expect(expr.type).toBe('UnaryOp');
    if (expr.type === 'UnaryOp') {
      expect(expr.operator).toBe(UnaryOperator.Neg);
      expect(expr.operand.type).toBe('Literal');
    }
  });

  test('should create binary operator expression', () => {
    const leftExpr = createLiteralExpr(5);
    const rightExpr = createLiteralExpr(3);
    const expr = createBinaryOpExpr(leftExpr, BinaryOperator.Add, rightExpr);
    
    expect(expr.type).toBe('BinaryOp');
    if (expr.type === 'BinaryOp') {
      expect(expr.operator).toBe(BinaryOperator.Add);
      expect(expr.left.type).toBe('Literal');
      expect(expr.right.type).toBe('Literal');
    }
  });

  test('should create function call expression', () => {
    const args = [createVariableExpr('C'), createLiteralExpr(5)];
    const expr = createFunctionCallExpr('MA', args);
    
    expect(expr.type).toBe('FunctionCall');
    if (expr.type === 'FunctionCall') {
      expect(expr.name).toBe('MA');
      expect(expr.args).toHaveLength(2);
    }
  });

  test('should create grouped expression', () => {
    const innerExpr = createLiteralExpr(10);
    const expr = createGroupedExpr(innerExpr);
    
    expect(expr.type).toBe('Grouped');
    if (expr.type === 'Grouped') {
      expect(expr.expr.type).toBe('Literal');
    }
  });

  test('should create assignment statement', () => {
    const expr = createLiteralExpr(42);
    const stmt = createAssignmentStatement('VAR', expr);
    
    expect(stmt.type).toBe('Assignment');
    if (stmt.type === 'Assignment') {
      expect(stmt.variable).toBe('VAR');
      expect(stmt.expr.type).toBe('Literal');
    }
  });

  test('should create output statement', () => {
    const expr = createVariableExpr('C');
    const stmt = createOutputStatement('RESULT', expr, ['COLORRED']);
    
    expect(stmt.type).toBe('Output');
    if (stmt.type === 'Output') {
      expect(stmt.name).toBe('RESULT');
      expect(stmt.expr.type).toBe('Variable');
      expect(stmt.styles).toEqual(['COLORRED']);
    }
  });

  test('should create formula', () => {
    const stmt1 = createOutputStatement('MA5', createLiteralExpr(5), []);
    const stmt2 = createOutputStatement('MA10', createLiteralExpr(10), []);
    const formula = createFormula([stmt1, stmt2]);
    
    expect(formula.statements).toHaveLength(2);
    expect(formula.statements[0].type).toBe('Output');
    expect(formula.statements[1].type).toBe('Output');
  });
});
