import { createParser } from '../parser';

describe('Parser', () => {
  test('should parse simple expression', () => {
    const parser = createParser('MA5: MA(C, 5)');
    const formula = parser.parseFormula();
    
    expect(formula.statements).toHaveLength(1);
    expect(formula.statements[0].type).toBe('Output');
  });

  test('should parse assignment statement', () => {
    const parser = createParser('VAR := 10');
    const formula = parser.parseFormula();
    
    expect(formula.statements).toHaveLength(1);
    expect(formula.statements[0].type).toBe('Assignment');
  });

  test('should parse arithmetic expression', () => {
    const parser = createParser('RESULT: (C + H) * 2 - L');
    const formula = parser.parseFormula();
    
    expect(formula.statements).toHaveLength(1);
    expect(formula.statements[0].type).toBe('Output');
  });

  test('should parse comparison expression', () => {
    const parser = createParser('SIGNAL: C > REF(C, 1)');
    const formula = parser.parseFormula();
    
    expect(formula.statements).toHaveLength(1);
    expect(formula.statements[0].type).toBe('Output');
  });

  test('should parse multiple statements', () => {
    const parser = createParser('MA5: MA(C, 5)\nMA10: MA(C, 10)');
    const formula = parser.parseFormula();
    
    expect(formula.statements).toHaveLength(2);
    expect(formula.statements[0].type).toBe('Output');
    expect(formula.statements[1].type).toBe('Output');
  });

  test('should handle style attributes', () => {
    const parser = createParser('MA5: MA(C, 5), COLORRED, LINETHICK2');
    const formula = parser.parseFormula();
    
    expect(formula.statements).toHaveLength(1);
    expect(formula.statements[0].type).toBe('Output');
  });

  test('should throw error on invalid syntax', () => {
    const parser = createParser('MA5: MA(C, 5'); // 缺少右括号
    
    expect(() => {
      parser.parseFormula();
    }).toThrow();
  });

  test('should handle complex nested functions', () => {
    const parser = createParser('COMPLEX: IF(MA(C, 5) > MA(C, 10), 1, 0)');
    const formula = parser.parseFormula();
    
    expect(formula.statements).toHaveLength(1);
    expect(formula.statements[0].type).toBe('Output');
  });
});
