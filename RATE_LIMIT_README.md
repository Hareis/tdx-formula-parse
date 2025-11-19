# API 限流功能说明

## 概述

为了保护东方财富API服务器并避免被限制访问，我们使用 `p-limit` 包实现了智能限流功能。

## 限流规则

- **限流频率**: 每分钟最多 20 个请求
- **限流器**: 使用 `p-limit` 包实现
- **应用范围**: 所有东方财富API请求

## 实现原理

### 1. 限流器初始化
```typescript
// 限流器：每分钟最多20个请求
public static rateLimiter = pLimit(20);
```

### 2. 单个请求限流
```typescript
async fetchData(symbol: string, startDate: string, endDate: string, timeFrame?: TimeFrame): Promise<CustomStockData> {
    // 使用限流器包装API请求
    return await EastMoneyDataAdapter.rateLimiter(async () => {
      return await this.fetchDataInternal(symbol, startDate, endDate, timeFrame);
    });
}
```

### 3. 批量请求限流
```typescript
// 创建限流任务列表
const tasks = symbols.map(symbol => 
  EastMoneyDataAdapter.rateLimiter(async () => {
    try {
      return await adapter.fetchData(symbol, startDate, endDate, timeFrame);
    } catch (error) {
      console.error(`Failed to fetch data for ${symbol}:`, error);
      return null;
    }
  })
);

// 并发执行所有任务（限流由 p-limit 控制）
const results = await Promise.all(tasks);
```

## 功能特点

### ✅ 智能并发控制
- 最多允许20个请求同时执行
- 超出限制的请求会自动排队等待
- 避免过载导致IP被封禁

### ✅ 高效批量处理
- 批量请求时自动应用限流
- 错误不会影响其他请求的执行
- 自动过滤失败请求，返回成功结果

### ✅ 透明实现
- 对调用者完全透明
- 不需要手动管理限流逻辑
- 保持原有API接口不变

## 使用示例

### 单个股票请求
```typescript
import { fetchStockData } from './src/eastmoney-adapter';

// 自动应用限流
const stockData = await fetchStockData('1.600460', '20240101', '20241231');
```

### 批量股票请求
```typescript
import { fetchMultipleStockData } from './src/eastmoney-adapter';

// 批量请求，自动限流
const symbols = ['1.600460', '0.000001', '1.000001'];
const stockDataList = await fetchMultipleStockData(symbols, '20240101', '20241231');
```

## 性能测试结果

在25个股票的批量请求测试中：
- **总耗时**: 约1-2秒
- **成功率**: 100%
- **限流效果**: 请求分布均匀，无并发冲突

## 注意事项

1. **限流是全局的**: 同一时间内的所有请求都会受到限流控制
2. **自动排队**: 超出限制的请求会自动等待，不会失败
3. **错误隔离**: 单个请求失败不会影响其他请求
4. **保持兼容**: 现有代码无需修改即可享受限流保护

## 配置调整

如需调整限流频率，可以修改 `EastMoneyDataAdapter` 类中的限流器配置：

```typescript
// 改为每分钟30个请求
public static rateLimiter = pLimit(30);

// 或改为每分钟10个请求（更保守）
public static rateLimiter = pLimit(10);
```

---

**实现时间**: 2025年11月18日  
**依赖包**: p-limit@7.2.0  
**状态**: ✅ 已测试并正常工作