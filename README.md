# TDX公式解析器 - TypeScript版本

这是一个将Rust实现的通达信(TDX)股票公式解析器完整移植到TypeScript的项目。

## 项目结构

项目保持了与Rust原项目相同的模块结构：

```
src/
├── token.ts      # 词法单元定义
├── lexer.ts      # 词法分析器
├── ast.ts        # 抽象语法树定义
├── parser.ts     # 语法分析器
├── evaluator.ts  # 求值器
├── data.ts       # 数据结构定义
└── index.ts      # 主入口文件
```

## 功能特性

- ✅ **词法分析器**: 将公式文本拆分为Token序列
- ✅ **语法分析器**: 使用Pratt Parsing算法构建抽象语法树  
- ✅ **求值器**: 执行AST并计算指标数值
- ✅ **内置函数**: MA、REF、SUM、HHV、LLV、IF、CROSS等20+个函数
- ✅ **错误处理**: 完善的语法错误检测和提示机制
- ✅ **类型安全**: 完整的TypeScript类型定义

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 构建项目

```bash
pnpm run build
```

### 运行测试

```bash
pnpm test
```

### 运行示例

```bash
npx ts-node examples/simple-usage.ts
```

## 使用示例

```typescript
import { Lexer } from './src/lexer';
import { createParser } from './src/parser';
import { createEvaluator } from './src/evaluator';
import { InputDataBuilder } from './src/data';

// 1. 创建股票数据
const inputData = new InputDataBuilder()
  .addBar(10.0, 11.0, 9.5, 10.5, 1000)
  .addBar(10.5, 12.0, 10.0, 11.5, 1500)
  .addBar(11.5, 12.5, 11.0, 12.0, 2000)
  .build();

// 2. 定义公式
const formulaText = `
MA5: MA(C, 5), COLORRED;
SIGNAL: CROSS(MA5, C), COLORGREEN;
`;

// 3. 解析和求值
const parser = createParser(formulaText);
const formula = parser.parseFormula();
const evaluator = createEvaluator(inputData);
const result = evaluator.evaluateFormula(formula);

// 4. 输出结果
result.outputLines.forEach(line => {
  console.log(`${line.name}: ${line.data.join(', ')}`);
});
```

## 支持的语法

### 基本运算符
- 算术运算: `+`, `-`, `*`, `/`
- 比较运算: `>`, `<`, `>=`, `<=`, `==`, `<>`
- 逻辑运算: `AND`, `OR`, `NOT`

### 内置函数
| 函数 | 描述 | 示例 |
|------|------|------|
| `MA` | 移动平均 | `MA(C, 5)` |
| `REF` | 向前引用 | `REF(C, 1)` |
| `SUM` | 周期求和 | `SUM(V, 10)` |
| `HHV` | 周期最高值 | `HHV(H, 20)` |
| `LLV` | 周期最低值 | `LLV(L, 20)` |
| `IF` | 条件判断 | `IF(C>10, 1, 0)` |
| `CROSS` | 交叉判断 | `CROSS(MA5, MA10)` |
| `ABS` | 绝对值 | `ABS(C-O)` |
| `MAX/MIN` | 最大值/最小值 | `MAX(C, O)` |
| `COUNT` | 条件计数 | `COUNT(C>10, 5)` |

### 内置变量
- `O` - 开盘价
- `H` - 最高价  
- `L` - 最低价
- `C` - 收盘价
- `V` - 成交量

## 测试

项目包含完整的单元测试：

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test -- lexer.test.ts
pnpm test -- evaluator.test.ts

# 监视模式
pnpm test:watch
```

## 开发

### 代码规范

```bash
# 代码检查
pnpm run lint

# 自动修复
pnpm run lint:fix
```

### 类型检查

```bash
# 编译TypeScript
pnpm run build

# 开发模式（监视文件变化）
pnpm run dev
```

## 与Rust版本的对比

| 特性 | TypeScript版本 | Rust版本 |
|------|----------------|----------|
| 语言 | TypeScript | Rust |
| 运行环境 | Node.js | 原生/WebAssembly |
| 性能 | 良好 | 优秀 |
| 开发效率 | 高 | 中等 |
| 类型安全 | 完全类型安全 | 完全类型安全 |
| 生态系统 | 丰富的npm包 | 丰富的crate |

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。