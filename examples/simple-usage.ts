// 简单的使用示例
import { Lexer } from '../src/lexer';
import { createParser } from '../src/parser';
import { createEvaluator } from '../src/evaluator';
import { InputDataBuilder } from '../src/data';

// 创建测试数据
const inputData = new InputDataBuilder()
  .addBar(10.0, 11.0, 9.5, 10.5, 1000)  // 第1根K线
  .addBar(10.5, 12.0, 10.0, 11.5, 1500)  // 第2根K线
  .addBar(11.5, 12.5, 11.0, 12.0, 2000) // 第3根K线
  .addBar(12.0, 13.0, 11.5, 12.5, 1800)  // 第4根K线
  .addBar(12.5, 13.5, 12.0, 13.0, 2200)  // 第5根K线
  .build();

// 测试公式：计算5日均线
const formula1 = `
MA5: MA(C, 5), COLORRED;
`;

// 测试公式：交叉判断
const formula2 = `
MA5: MA(C, 5), COLORRED;
MA10: MA(C, 10), COLORBLUE;
CROSS_SIGNAL: CROSS(MA5, MA10), COLORGREEN;
`;

// 测试公式：条件判断
const formula3 = `
VOL_SIGNAL: IF(V > 1500, C, REF(C, 1)), COLORBLUE;
`;

function testFormula(input: string, formulaText: string) {
  console.log(`\n=== 测试公式: ${input} ===`);
  console.log(`公式内容: ${formulaText}`);
  
  try {
    // 创建语法分析器
    const parser = createParser(formulaText);
    const formula = parser.parseFormula();
    
    // 创建求值器
    const evaluator = createEvaluator(inputData);
    const result = evaluator.evaluateFormula(formula);
    
    console.log('解析成功!');
    console.log('输出结果:');
    
    result.outputLines.forEach(line => {
      console.log(`  ${line.name}: ${line.data.slice(0, 5).join(', ')}...`);
      console.log(`    样式: ${line.styles.join(', ')}`);
    });
    
  } catch (error) {
    console.error('解析失败:', error.message);
  }
}

// 运行测试
testFormula('简单移动平均', formula1);
testFormula('交叉判断', formula2);
testFormula('条件判断', formula3);

console.log('\n=== 词法分析器测试 ===');
// 测试词法分析器
const testInput = 'MA5: MA(C, 5), COLORRED;';
const lexer = new Lexer(testInput);

console.log(`输入: ${testInput}`);
console.log('Token序列:');

let token = lexer.nextToken();
while (token.tokenType !== 'Eof') {
  console.log(`  ${token.tokenType}: '${token.lexeme}' (${token.line}:${token.column})`);
  token = lexer.nextToken();
}