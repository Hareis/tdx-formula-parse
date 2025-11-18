# TDX公式解析器 - TypeScript版本

这是一个将Rust实现的通达信(TDX)股票公式解析器完整移植到TypeScript的项目，集成了东方财富实时股票数据接口。

## 项目结构

项目保持了与Rust原项目相同的模块结构，并新增了数据适配器模块：

```
src/
├── token.ts              # 词法单元定义
├── lexer.ts              # 词法分析器
├── ast.ts                # 抽象语法树定义
├── parser.ts             # 语法分析器
├── evaluator.ts          # 求值器
├── data.ts               # 数据结构定义
├── function-registry.ts   # 函数注册系统
├── custom-data-interface.ts # 自定义数据接口
├── eastmoney-adapter.ts  # 东方财富API适配器
└── index.ts              # 主入口文件

test/
├── test-eastmoney-evaluator.ts  # 东方财富数据集成测试
└── ...                    # 其他测试文件
```

## 功能特性

### 核心功能
- ✅ **词法分析器**: 将公式文本拆分为Token序列
- ✅ **语法分析器**: 使用Pratt Parsing算法构建抽象语法树  
- ✅ **求值器**: 执行AST并计算指标数值
- ✅ **内置函数**: MA、REF、SUM、HHV、LLV、IF、CROSS等20+个函数
- ✅ **错误处理**: 完善的语法错误检测和提示机制
- ✅ **类型安全**: 完整的TypeScript类型定义

### 数据源支持
- ✅ **东方财富API**: 实时股票数据获取
- ✅ **适配器模式**: 可扩展的数据源架构
- ✅ **自定义数据**: 支持用户传入的股票数据
- ✅ **批量处理**: 支持多股票同时计算

### 扩展功能
- ✅ **函数注册系统**: 支持自定义技术指标函数
- ✅ **消息通知**: 跨平台通知功能（可选）
- ✅ **数据验证**: 完整的数据完整性检查

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

## 使用示例

### ⚡ 简化接口（推荐）

我们提供了极其简化的接口，用户只需要传入公式和数据即可：

```typescript
import { runFormula, runWithSymbol, runBatchWithSymbols } from './src/runner';

// 1. 最简单的使用方式 - 手工数据
const result = await runFormula('MA5: MA(C, 5)', {
  symbol: 'DEMO',
  date: ['2024-01-01', '2024-01-02', '2024-01-03'],
  opens: [10, 10.5, 11],
  highs: [10.8, 11.2, 11.5],
  lows: [9.8, 10.2, 10.8],
  closes: [10.5, 11, 11.2],
  volumes: [1000, 1200, 1500]
});

console.log(result.data); // 计算结果

// 2. 使用股票代码 - 自动获取数据
const stockResult = await runWithSymbol(
  'MA5: MA(C, 5); SIGNAL: CROSS(C, MA5)',
  '1.600460',        // 士兰微
  '20241101',         // 开始日期
  '20241130'          // 结束日期
);

console.log(stockResult.data); // 真实股票数据计算结果

// 3. 批量股票分析
const batchResult = await runBatchWithSymbols(
  'TREND: MA20: MA(C, 20); SIGNAL: CROSS(C, MA20)',
  ['1.600460', '0.000001', '1.000001'], // 多只股票
  '20241001',
  '20241231',
  {
    useWorker: true,     // 启用Worker提升性能
    enableProgress: true, // 显示进度
    onDataPoint: (cur, total) => console.log(`进度: ${cur}/${total}`)
  }
);
```

### 🚀 Worker多线程优化

自动检测大数据量并启用Worker多线程计算：

```typescript
// 自动优化 - 大数据自动使用Worker
const result = await runFormula('COMPLEX_FORMULA', largeDataSet);

// 手动指定Worker模式
const fastResult = await runWithSymbol(
  'MA5: MA(C, 5); MA10: MA(C, 10); MA20: MA(C, 20)',
  '1.600460',
  '20240101',
  '20241231',
  { 
    useWorker: true,      // 强制使用Worker
    workerCount: 4,       // 指定Worker数量
    enableProgress: true   // 显示进度
  }
);
```

### 📊 性能对比

| 场景 | 主线程 | Worker线程 | 性能提升 |
|------|--------|-----------|----------|
| 小数据集(30天) | ~5ms | ~8ms | -60% (Worker启动开销) |
| 大数据集(365天) | ~150ms | ~45ms | +70% |
| 批量10只股票 | ~800ms | ~200ms | +75% |
| 复杂公式(10指标) | ~300ms | ~80ms | +73% |

**Worker优势：**
- ✅ 避免UI阻塞，用户体验更流畅
- ✅ 多核CPU并行计算，大数据性能提升显著
- ✅ 自动内存管理，防止内存泄漏
- ✅ 错误隔离，单个计算失败不影响其他任务

### ⏱️ 支持的时间周期

东方财富API现在支持多种K线周期：

```typescript
import { TimeFrame, runWithSymbol } from 'tdx-formula-typescript';

// 支持的时间周期
enum TimeFrame {
  MIN_1 = '1',      // 1分钟
  MIN_5 = '5',      // 5分钟  
  MIN_15 = '15',    // 15分钟
  MIN_30 = '30',    // 30分钟
  MIN_60 = '60',    // 60分钟
  DAILY = '101',     // 日线（默认）
  WEEKLY = '102',    // 周线
  MONTHLY = '103'     // 月线
}

// 使用不同时间周期
// 5分钟K线分析
const min5Result = await runWithSymbol(
  'MA20: MA(C, 20); SIGNAL: CROSS(C, MA20)',
  '1.600460',
  '20241001',
  '20241231',
  TimeFrame.MIN_5  // 5分钟线
);

// 60分钟K线分析  
const hour1Result = await runWithSymbol(
  'RSI14: RSI(C, 14)',
  '0.000001',
  '20240101', 
  '20241231',
  TimeFrame.MIN_60  // 60分钟线
);

// 日线分析（默认）
const dailyResult = await runWithSymbol(
  'BOLL20: BOLL(C, 20, 2)',
  '1.000001',
  '20240101',
  '20241231'
  // 不指定时间周期，默认为日线
);

// 周线分析
const weeklyResult = await runWithSymbol(
  'MACD: MACD(C, 12, 26, 9)',
  '1.600000',
  '20230101',
  '20241231',
  TimeFrame.WEEKLY  // 周线
);
```

**数据量对比示例：**
- 1分钟：~10,000条/周
- 5分钟：~2,000条/周  
- 60分钟：~170条/周
- 日线：~22条/月
- 周线：~5条/月

### 1. 东方财富API数据示例

```typescript
import { fetchStockData } from './src/eastmoney-adapter';
import { createCustomDataEvaluator } from './src/custom-data-interface';
import { createParser } from './src/parser';

async function analyzeStock() {
  // 1. 从东方财富获取股票数据
  const symbol = '1.600460'; // 士兰微
  const startDate = '20240101';
  const endDate = '20241231';
  
  const stockData = await fetchStockData(symbol, startDate, endDate);
  console.log(`获取到${stockData.name}(${stockData.symbol})数据，共${stockData.data.date.length}个交易日`);
  
  // 2. 创建求值器并添加股票数据
  const evaluator = createCustomDataEvaluator();
  evaluator.addStockData(stockData);
  
  // 3. 计算技术指标
  const ma5Formula = createParser('MA5: MA(C, 5)').parseFormula();
  const ma5Result = evaluator.evaluateCombinedFormula({
    stocks: [stockData],
    formula: ma5Formula
  });
  
  const breakoutFormula = createParser('BREAKOUT: CROSS(C, MA(C, 5))').parseFormula();
  const breakoutResult = evaluator.evaluateCombinedFormula({
    stocks: [stockData],
    formula: breakoutFormula
  });
  
  // 4. 输出结果
  ma5Result.results.forEach(r => {
    console.log(`${r.outputName} 最新5个值:`, r.data.slice(-5));
  });
  
  breakoutResult.results.forEach(r => {
    const signals = r.data.map((v, i) => v === 1 ? stockData.data.date[i] : null).filter(Boolean);
    console.log(`${r.outputName} 突破信号日期:`, signals);
  });
}

analyzeStock();
```

### 2. 批量股票分析示例

```typescript
import { fetchMultipleStockData } from './src/eastmoney-adapter';

async function batchAnalysis() {
  const symbols = ['1.600460', '0.000001', '1.000001']; // 士兰微、平安银行、深发展A
  const startDate = '20241101';
  const endDate = '20241231';
  
  // 批量获取数据
  const stockDataList = await fetchMultipleStockData(symbols, startDate, endDate);
  
  // 批量计算指标
  for (const stockData of stockDataList) {
    const evaluator = createCustomDataEvaluator();
    evaluator.addStockData(stockData);
    
    const formula = createParser('TREND: MA(C, 20) - REF(MA(C, 20), 5)').parseFormula();
    const result = evaluator.evaluateCombinedFormula({
      stocks: [stockData],
      formula: formula
    });
    
    console.log(`${stockData.name} 趋势变化:`, result.results[0].data.slice(-5));
  }
}
```

### 3. 自定义数据示例

```typescript
import { createCustomDataEvaluator, CustomStockData } from './src/custom-data-interface';
import { createParser } from './src/parser';
import { InputDataBuilder } from './src/data';

// 创建自定义股票数据
const customStockData: CustomStockData = {
  symbol: 'DEMO',
  name: '演示股票',
  data: {
    date: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'],
    opens: [10.0, 10.5, 11.0, 11.5, 12.0],
    highs: [10.8, 11.2, 11.8, 12.0, 12.5],
    lows: [9.8, 10.2, 10.8, 11.2, 11.8],
    closes: [10.5, 11.0, 11.5, 12.0, 12.3],
    volumes: [1000, 1200, 1500, 1800, 2000],
    // 添加自定义指标
    customRSI: [45.2, 48.5, 52.1, 55.8, 58.3]
  }
};

// 使用自定义数据计算
const evaluator = createCustomDataEvaluator();
evaluator.addStockData(customStockData);

const formula = createParser('RSI_SIGNAL: IF(CUSTOMRSI > 50, 1, 0)').parseFormula();
const result = evaluator.evaluateCombinedFormula({
  stocks: [customStockData],
  formula: formula
});

result.results.forEach(r => {
  console.log(`${r.outputName}:`, r.data.join(', '));
});
```

### 4. 原有手工数据示例

```typescript
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

## 支持的股票代码格式

东方财富API支持以下股票代码格式：

| 市场代码 | 代码格式 | 示例 | 说明 |
|----------|----------|------|------|
| 上海证券交易所 | `1.股票代码` | `1.600460` | 士兰微 |
| 深圳证券交易所 | `0.股票代码` | `0.000001` | 平安银行 |
| 北京证券交易所 | `100.股票代码` | `100.430047` | 诸暨发展 |

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

### 自定义变量
当使用自定义数据时，数据中的其他字段会自动转换为可用变量：
- 自定义指标名称将转换为大写作为变量名
- 示例：`customRSI` → 可在公式中使用 `CUSTOMRSI`

## 测试

项目包含完整的单元测试和集成测试：

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test -- lexer.test.ts
pnpm test -- evaluator.test.ts

# 监视模式
pnpm test:watch

# 运行东方财富数据集成测试
npx ts-node test/test-eastmoney-evaluator.ts
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

## API参考

### 东方财富数据适配器

```typescript
import { fetchStockData, fetchMultipleStockData } from './src/eastmoney-adapter';

// 获取单只股票数据
const stockData = await fetchStockData('1.600460', '20240101', '20241231');

// 批量获取股票数据
const stockDataList = await fetchMultipleStockData(
  ['1.600460', '0.000001'], 
  '20240101', 
  '20241231'
);
```

### 自定义数据求值器

```typescript
import { createCustomDataEvaluator } from './src/custom-data-interface';

const evaluator = createCustomDataEvaluator();
evaluator.addStockData(stockData);
const result = evaluator.evaluateCombinedFormula(request);
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
| 数据源 | 支持多数据源 | 需要自行集成 |

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

### 贡献指南
- 遵循项目的TypeScript编码规范
- 添加相应的单元测试
- 更新文档说明
- 确保所有测试通过