import { InputDataBuilder } from '../data';
import { createEvaluator } from '../evaluator';
import { createParser } from '../parser';

describe('Evaluator', () => {
  let inputData: any;

  beforeEach(() => {
    // 创建测试数据
    inputData = new InputDataBuilder()
      .addBar(10, 12, 9, 11, 100)
      .addBar(11, 13, 10, 12, 200)
      .addBar(12, 14, 11, 13, 300)
      .addBar(13, 15, 12, 14, 400)
      .addBar(14, 16, 13, 15, 500)
      .build();
  });

  test('should evaluate simple arithmetic', () => {
    const parser = createParser('RESULT: C + 5')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('RESULT');
    expect(result.outputLines[0].data).toEqual([16, 17, 18, 19, 20]);
  });

  test('should evaluate MA function', () => {
    const parser = createParser('MA3: MA(C, 3)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('MA3');
    
    // 前2个值应为null（周期不足）
    expect(result.outputLines[0].data[0]).toBeNull();
    expect(result.outputLines[0].data[1]).toBeNull();
    
    // 第3个值应该是 (11+12+13)/3 = 12
    expect(result.outputLines[0].data[2]).toBeCloseTo(12);
    // 第4个值应该是 (12+13+14)/3 = 13
    expect(result.outputLines[0].data[3]).toBeCloseTo(13);
  });

  test('should evaluate REF function', () => {
    const parser = createParser('REF1: REF(C, 1)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('REF1');
    
    // 第1个值应为null（向前引用1个周期）
    expect(result.outputLines[0].data[0]).toBeNull();
    // 第2个值应该是第1个收盘价11
    expect(result.outputLines[0].data[1]).toBe(11);
    // 第3个值应该是第2个收盘价12
    expect(result.outputLines[0].data[2]).toBe(12);
  });

  test('should evaluate SUM function', () => {
    const parser = createParser('SUM2: SUM(V, 2)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('SUM2');
    
    // 第1个值应为null（周期不足）
    expect(result.outputLines[0].data[0]).toBeNull();
    // 第2个值应该是 100+200 = 300
    expect(result.outputLines[0].data[1]).toBe(300);
    // 第3个值应该是 200+300 = 500
    expect(result.outputLines[0].data[2]).toBe(500);
  });

  test('should evaluate IF function', () => {
    const parser = createParser('IF_SIGNAL: IF(C > 12, 1, 0)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('IF_SIGNAL');
    
    // 收盘价序列: [11, 12, 13, 14, 15]
    // 条件: C > 12
    expect(result.outputLines[0].data).toEqual([0, 0, 1, 1, 1]);
  });

  test('should handle builtin variables', () => {
    const parser = createParser('HIGH_LOW: H - L')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('HIGH_LOW');
    
    // 最高价序列: [12, 13, 14, 15, 16]
    // 最低价序列: [9, 10, 11, 12, 13]
    // 差值: [3, 3, 3, 3, 3]
    expect(result.outputLines[0].data).toEqual([3, 3, 3, 3, 3]);
  });

  test('should handle assignment statements', () => {
    const parser = createParser('MA5 := MA(C, 2)\nSIGNAL: MA5')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('SIGNAL');
    
    // 前1个值应为null
    expect(result.outputLines[0].data[0]).toBeNull();
    // 第2个值应该是 (11+12)/2 = 11.5
    expect(result.outputLines[0].data[1]).toBeCloseTo(11.5);
  });

  test('should handle complex expressions', () => {
    const parser = createParser('COMPLEX: (C + H) * 2 - L')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('COMPLEX');
    
    // 验证第一个值: (11 + 12) * 2 - 9 = 23*2 - 9 = 46 - 9 = 37
    expect(result.outputLines[0].data[0]).toBe(37);
  });

  // 二元运算符测试 - 算术运算
  test('should evaluate addition operator', () => {
    const parser = createParser('ADD: C + 5')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([16, 17, 18, 19, 20]);
  });

  test('should evaluate subtraction operator', () => {
    const parser = createParser('SUB: C - 2')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([9, 10, 11, 12, 13]);
  });

  test('should evaluate multiplication operator', () => {
    const parser = createParser('MUL: C * 2')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([22, 24, 26, 28, 30]);
  });

  test('should evaluate division operator', () => {
    const parser = createParser('DIV: C / 2')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([5.5, 6, 6.5, 7, 7.5]);
  });

  test('should handle division by zero', () => {
    const parser = createParser('DIV_ZERO: C / 0')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 除零应该返回null
    expect(result.outputLines[0].data).toEqual([null, null, null, null, null]);
  });

  // 二元运算符测试 - 比较运算
  test('should evaluate greater than operator', () => {
    const parser = createParser('GT: C > 12')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 收盘价序列: [11, 12, 13, 14, 15]
    expect(result.outputLines[0].data).toEqual([0, 0, 1, 1, 1]);
  });

  test('should evaluate less than operator', () => {
    const parser = createParser('LT: C < 12')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([1, 0, 0, 0, 0]);
  });

  test('should evaluate greater than or equal operator', () => {
    const parser = createParser('GTEQ: C >= 12')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([0, 1, 1, 1, 1]);
  });

  test('should evaluate less than or equal operator', () => {
    const parser = createParser('LTEQ: C <= 12')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([1, 1, 0, 0, 0]);
  });

  test('should evaluate equal operator', () => {
    const parser = createParser('EQ: C == 12')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([0, 1, 0, 0, 0]);
  });

  test('should evaluate not equal operator', () => {
    const parser = createParser('NEQ: C <> 12')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([1, 0, 1, 1, 1]);
  });

  // 二元运算符测试 - 逻辑运算
  test('should evaluate logical AND operator', () => {
    const parser = createParser('AND1: (C > 12) AND (H > 13)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // C > 12: [0, 0, 1, 1, 1]
    // H > 13: [0, 0, 1, 1, 1]
    // AND: [0, 0, 1, 1, 1]
    expect(result.outputLines[0].data).toEqual([0, 0, 1, 1, 1]);
  });

  test('should evaluate logical OR operator', () => {
    const parser = createParser('OR1: (C < 11) OR (H > 15)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // C < 11: [0, 0, 0, 0, 0]
    // H > 15: [0, 0, 0, 0, 1]
    // OR: [0, 0, 0, 0, 1]
    expect(result.outputLines[0].data).toEqual([0, 0, 0, 0, 1]);
  });

  // 边界情况测试
  test('should handle null values in binary operations', () => {
    // 创建一个包含null值的测试数据
    const customInputData = new InputDataBuilder()
      .addBar(10, 12, 9, 11, 100)
      .addBar(11, 13, 10, 12, 200)
      .addBar(12, 14, 11, 13, 300)
      .build();
    
    // 使用类型断言绕过类型检查，手动修改收盘价数据使其包含null
    (customInputData.closes as any)[1] = null;

    const parser = createParser('NULL_TEST: C + 5')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(customInputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 当遇到null值时，结果应该为null
    expect(result.outputLines[0].data).toEqual([16, null, 18]);
  });

  test('should handle different length arrays error', () => {
    // 创建一个包含不同长度数组的测试数据
    const customInputData = new InputDataBuilder()
      .addBar(10, 12, 9, 11, 100)
      .addBar(11, 13, 10, 12, 200)
      .build();
    
    // 手动修改环境变量长度不一致
    const parser = createParser('TEST: C')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(customInputData);
    
    // 手动模拟不同长度的情况 - 直接修改evaluator的环境变量
    const evaluatorInstance = (evaluator as any);
    
    // 使用环境对象的set方法添加不同长度的变量
    evaluatorInstance.environment.set('TestVar1', [1, 2, 3]); // 长度为3
    evaluatorInstance.environment.set('TestVar2', [1, 2]);     // 长度为2
    
    // 使用直接调用evaluateBinaryOp进行测试
    expect(() => {
      evaluatorInstance.evaluateBinaryOp(
        { type: 'Variable', name: 'TestVar1' },
        'Add',
        { type: 'Variable', name: 'TestVar2' }
      );
    }).toThrow('Binary operation requires arrays of same length');
  });

  // 复杂表达式测试
  test('should handle nested binary operations', () => {
    const parser = createParser('NESTED: (C + H) * (L - O)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 第一个值: (11 + 12) * (9 - 10) = 23 * (-1) = -23
    expect(result.outputLines[0].data[0]).toBe(-23);
  });

  test('should handle mixed operators with correct precedence', () => {
    const parser = createParser('PRECEDENCE: C + H * 2')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 第一个值: 11 + (12 * 2) = 11 + 24 = 35
    expect(result.outputLines[0].data[0]).toBe(35);
  });

  // 变量间运算测试
  test('should evaluate between different variables', () => {
    const parser = createParser('VAR_OPS: H - L')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 高低价差: [3, 3, 3, 3, 3]
    expect(result.outputLines[0].data).toEqual([3, 3, 3, 3, 3]);
  });

  test('should evaluate variable with number', () => {
    const parser = createParser('VAR_NUM: C * 1.5')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines[0].data).toEqual([16.5, 18, 19.5, 21, 22.5]);
  });

  // 逻辑运算边界测试
  test('should handle logical operations with zero values', () => {
    const parser = createParser('LOGIC_ZERO: (C > 0) AND (H > 0)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 所有值都大于0，结果应该都是1
    expect(result.outputLines[0].data).toEqual([1, 1, 1, 1, 1]);
  });

  test('should handle logical operations with false conditions', () => {
    const parser = createParser('LOGIC_FALSE: (C < 0) OR (H < 0)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 所有值都大于0，结果应该都是0
    expect(result.outputLines[0].data).toEqual([0, 0, 0, 0, 0]);
  });

  // ===== 新增测试用例 =====

  // 一元运算符测试
  test('should evaluate negation operator', () => {
    const parser = createParser('NEGATION: -C')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 收盘价序列: [11, 12, 13, 14, 15]
    // 取反后: [-11, -12, -13, -14, -15]
    expect(result.outputLines[0].data).toEqual([-11, -12, -13, -14, -15]);
  });

  test('should evaluate logical NOT operator', () => {
    const parser = createParser('NOT_OP: NOT (C > 12)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // C > 12: [0, 0, 1, 1, 1]
    // NOT: [1, 1, 0, 0, 0]
    expect(result.outputLines[0].data).toEqual([1, 1, 0, 0, 0]);
  });

  test('should handle unary operations with null values', () => {
    // 创建包含null值的测试数据
    const customInputData = new InputDataBuilder()
      .addBar(10, 12, 9, 11, 100)
      .addBar(11, 13, 10, 12, 200)
      .addBar(12, 14, 11, 13, 300)
      .build();
    
    // 手动修改收盘价数据使其包含null
    (customInputData.closes as any)[1] = null;

    const parser = createParser('NULL_UNARY: -C')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(customInputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 当遇到null值时，结果应该为null
    expect(result.outputLines[0].data).toEqual([-11, null, -13]);
  });

  // 剩余内置函数测试
  test('should evaluate HHV function', () => {
    const parser = createParser('HHV3: HHV(H, 3)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('HHV3');
    
    // 最高价序列: [12, 13, 14, 15, 16]
    // 前2个值应为null
    expect(result.outputLines[0].data[0]).toBeNull();
    expect(result.outputLines[0].data[1]).toBeNull();
    
    // 第3个值应该是 12,13,14中的最大值14
    expect(result.outputLines[0].data[2]).toBe(14);
    // 第4个值应该是 13,14,15中的最大值15
    expect(result.outputLines[0].data[3]).toBe(15);
  });

  test('should evaluate LLV function', () => {
    const parser = createParser('LLV3: LLV(L, 3)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('LLV3');
    
    // 最低价序列: [9, 10, 11, 12, 13]
    // 前2个值应为null
    expect(result.outputLines[0].data[0]).toBeNull();
    expect(result.outputLines[0].data[1]).toBeNull();
    
    // 第3个值应该是 9,10,11中的最小值9
    expect(result.outputLines[0].data[2]).toBe(9);
    // 第4个值应该是 10,11,12中的最小值10
    expect(result.outputLines[0].data[3]).toBe(10);
  });

  test('should evaluate CROSS function', () => {
    // 创建可以产生交叉的测试数据
    const crossInputData = new InputDataBuilder()
      .addBar(10, 12, 9, 11, 100)   // C=11, O=10 (C>O - 不是交叉)
      .addBar(12, 13, 10, 10, 200)   // C=10, O=12 (C<O - 条件准备)
      .addBar(13, 15, 12, 14, 300)   // C=14, O=13 (C>O - 发生交叉)
      .build();

    const parser = createParser('CROSS_SIGNAL: CROSS(C, O)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(crossInputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('CROSS_SIGNAL');
    
    // 检查结果序列
    expect(result.outputLines[0].data).toEqual([0, 0, 1]);
  });

  test('should evaluate ABS function', () => {
    const parser = createParser('ABS_VAL: ABS(C - 13)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('ABS_VAL');
    
    // C - 13: [11-13=-2, 12-13=-1, 13-13=0, 14-13=1, 15-13=2]
    // ABS: [2, 1, 0, 1, 2]
    expect(result.outputLines[0].data).toEqual([2, 1, 0, 1, 2]);
  });

  test('should evaluate MAX function', () => {
    const parser = createParser('MAX_VAL: MAX(C, O)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('MAX_VAL');
    
    // 收盘价序列: [11, 12, 13, 14, 15]
    // 开盘价序列: [10, 11, 12, 13, 14]
    // MAX: [11, 12, 13, 14, 15]
    expect(result.outputLines[0].data).toEqual([11, 12, 13, 14, 15]);
  });

  test('should evaluate MIN function', () => {
    const parser = createParser('MIN_VAL: MIN(C, O)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('MIN_VAL');
    
    // 收盘价序列: [11, 12, 13, 14, 15]
    // 开盘价序列: [10, 11, 12, 13, 14]
    // MIN: [10, 11, 12, 13, 14]
    expect(result.outputLines[0].data).toEqual([10, 11, 12, 13, 14]);
  });

  test('should evaluate COUNT function', () => {
    const parser = createParser('COUNT_SIGNAL: COUNT(C > 12, 3)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('COUNT_SIGNAL');
    
    // C > 12: [0, 0, 1, 1, 1]
    // 前2个值应为null
    expect(result.outputLines[0].data[0]).toBeNull();
    expect(result.outputLines[0].data[1]).toBeNull();
    
    // 第3个值应该是前3个周期内条件成立次数: [0,0,1] = 1
    expect(result.outputLines[0].data[2]).toBe(1);
    // 第4个值应该是: [0,1,1] = 2
    expect(result.outputLines[0].data[3]).toBe(2);
    // 第5个值应该是: [1,1,1] = 3
    expect(result.outputLines[0].data[4]).toBe(3);
  });

  // 错误处理测试
  test('should throw error for undefined variable', () => {
    const parser = createParser('UNDEFINED: UnknownVar')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    expect(() => {
      evaluator.evaluateFormula(formula);
    }).toThrow('Undefined variable: UnknownVar');
  });

  test('should throw error for unknown function', () => {
    const parser = createParser('UNKNOWN: UNKNOWN_FUNC(C)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    expect(() => {
      evaluator.evaluateFormula(formula);
    }).toThrow('Unknown function: UNKNOWN_FUNC');
  });

  test('should throw error for function arguments with different lengths', () => {
    // 创建测试数据后，手动修改环境变量
    const evaluator = createEvaluator(inputData);
    const evaluatorInstance = (evaluator as any);
    
    // 手动设置不同长度的环境变量
    evaluatorInstance.environment.set('Var1', [1, 2, 3]);
    evaluatorInstance.environment.set('Var2', [1, 2]);
    
    expect(() => {
      evaluatorInstance.evaluateFunctionCall('TEST_FUNC', [
        { type: 'Variable', name: 'Var1' },
        { type: 'Variable', name: 'Var2' }
      ]);
    }).toThrow('Function TEST_FUNC requires arguments of same length');
  });

  test('should throw error for REF with negative offset', () => {
    const parser = createParser('INVALID_REF: REF(C, -1)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    expect(() => {
      evaluator.evaluateFormula(formula);
    }).toThrow('REF offset must be non-negative');
  });

  // 组表达式和嵌套表达式测试
  test('should handle grouped expressions', () => {
    const parser = createParser('GROUPED: (C + H) * 2')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 第一个值: (11 + 12) * 2 = 23 * 2 = 46
    expect(result.outputLines[0].data[0]).toBe(46);
  });

  test('should handle deeply nested expressions', () => {
    const parser = createParser('DEEP_NESTED: ((C + 1) * (H - 2)) / 3')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    // 第一个值: ((11 + 1) * (12 - 2)) / 3 = (12 * 10) / 3 = 120 / 3 = 40
    expect(result.outputLines[0].data[0]).toBeCloseTo(40);
  });

  // 赋值语句和输出语句的边界测试
  test('should handle multiple assignment statements', () => {
    const parser = createParser('MA5 := MA(C, 2)\nMA10 := MA(C, 3)\nSIGNAL: MA5 + MA10')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('SIGNAL');
    
    // 第3个值: MA5=12.5, MA10=12, 总和=24.5
    expect(result.outputLines[0].data[2]).toBeCloseTo(24.5);
  });

  test('should handle empty output name', () => {
    const parser = createParser('C')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    // 应该自动生成输出名称
    expect(result.outputLines[0].name).toBe('output_1');
  });

  test('should handle statement with styles', () => {
    const parser = createParser('STYLED: C, COLORSTICK')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('STYLED');
    expect(result.outputLines[0].styles).toContain('COLORSTICK');
  });

  // 复杂公式测试
  test('should evaluate complex technical indicator', () => {
    const parser = createParser('COMPLEX_IND: (MA(C, 3) + REF(C, 1)) * IF(C > 12, 2, 1)')
    const formula = parser.parseFormula();
    const evaluator = createEvaluator(inputData);
    
    const result = evaluator.evaluateFormula(formula);
    
    expect(result.outputLines).toHaveLength(1);
    expect(result.outputLines[0].name).toBe('COMPLEX_IND');
    
    // 验证非空值存在
    expect(result.outputLines[0].data[2]).not.toBeNull();
    expect(result.outputLines[0].data[3]).not.toBeNull();
  });

  test('should handle all builtin variables', () => {
    // 测试所有内置变量
    const tests = [
      { formula: 'OPEN: O', expected: [10, 11, 12, 13, 14] },
      { formula: 'HIGH: H', expected: [12, 13, 14, 15, 16] },
      { formula: 'LOW: L', expected: [9, 10, 11, 12, 13] },
      { formula: 'CLOSE: C', expected: [11, 12, 13, 14, 15] },
      { formula: 'VOLUME: V', expected: [100, 200, 300, 400, 500] }
    ];
    
    for (const testCase of tests) {
      const parser = createParser(testCase.formula)
      const formula = parser.parseFormula();
      const evaluator = createEvaluator(inputData);
      
      const result = evaluator.evaluateFormula(formula);
      
      expect(result.outputLines).toHaveLength(1);
      expect(result.outputLines[0].data).toEqual(testCase.expected);
    }
  });
});
