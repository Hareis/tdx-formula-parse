// 东方财富API数据适配器
import { CustomStockData } from './custom-data-interface';
import axios from 'axios';

// 东方财富API响应接口
interface EastMoneyResponse {
  rc: number;
  rt: number;
  svr: number;
  lt: number;
  full: number;
  dlmkts: string;
  dmkts: string;
  ftypes: string;
  klt: number;
  data: {
    code: string;
    name: string;
    market: number;
    marketCode: string;
    klines: string[];
  };
  extra: {
      code: string;
      klines: string[];
  }[];
}

// K线数据结构
interface KLineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  amplitude: number;
  changePercent: number;
  changeAmount: number;
  turnoverRate: number;
}

// 数据适配器接口
interface DataAdapter {
  fetchData(symbol: string, startDate: string, endDate: string): Promise<CustomStockData>;
  isSupported(symbol: string): boolean;
  getAdapterName(): string;
}

// 东方财富API适配器
export class EastMoneyDataAdapter implements DataAdapter {
  private baseUrl: string = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
  private userAgent: string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  getAdapterName(): string {
    return 'EastMoney';
  }

  isSupported(symbol: string): boolean {
    // 支持的股票代码格式：1.600460 (上海), 0.000001 (深圳), 100.600460 (北交所)
    const pattern = /^[0-9]+\.[0-9]{6}$/;
    return pattern.test(symbol);
  }

  async fetchData(symbol: string, startDate: string, endDate: string): Promise<CustomStockData> {
    if (!this.isSupported(symbol)) {
      throw new Error(`Unsupported symbol format: ${symbol}`);
    }

    try {
      // 构建API URL
      const url = new URL(this.baseUrl);
      url.searchParams.set('secid', symbol);
      url.searchParams.set('fields1', 'f1,f2,f3,f4,f5,f6');
      url.searchParams.set('fields2', 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61');
      url.searchParams.set('ut', '7eea3edcaed734bea9cbfc24409ed989');
      url.searchParams.set('klt', '101'); // 日K线
      url.searchParams.set('fqt', '1');   // 前复权
      url.searchParams.set('beg', startDate.replace(/-/g, ''));
      url.searchParams.set('end', endDate.replace(/-/g, ''));
      url.searchParams.set('_', Date.now().toString());

      console.log(`Fetching data from: ${url.toString()}`);

      // 发送请求
      const response = await axios.get<EastMoneyResponse>(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
          'Referer': 'https://quote.eastmoney.com/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        timeout: 10000,
      });

      // 检查响应状态
      if (response.data.rc !== 0) {
        throw new Error(`API returned error code: ${response.data.rc}`);
      }

      const stockInfo = response.data.data;
      if (!stockInfo) {
        throw new Error(`No stock data found for symbol: ${symbol}`);
      }
      
      const klines = stockInfo.klines;

      if (!klines || klines.length === 0) {
        throw new Error(`No k-line data found for symbol: ${symbol}`);
      }

      // 解析K线数据
      const klineData = this.parseKLines(klines);
      
      // 转换为CustomStockData格式
      return this.convertToCustomStockData(symbol, stockInfo.name, klineData);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error fetching data for ${symbol}: ${error.message}`);
      }
      throw error;
    }
  }

  // 解析K线数据字符串
  private parseKLines(klines: string[]): KLineData[] {
    return klines.map(kline => {
      const parts = kline.split(',');
      if (parts.length < 11) {
        throw new Error(`Invalid kline data format: ${kline}`);
      }

      return {
        date: parts[0],           // 日期
        open: parseFloat(parts[1]), // 开盘价
        close: parseFloat(parts[2]), // 收盘价
        high: parseFloat(parts[3]),  // 最高价
        low: parseFloat(parts[4]),   // 最低价
        volume: parseFloat(parts[5]), // 成交量
        turnover: parseFloat(parts[6]), // 成交额
        amplitude: parseFloat(parts[7]), // 振幅
        changePercent: parseFloat(parts[8]), // 涨跌幅
        changeAmount: parseFloat(parts[9]), // 涨跌额
        turnoverRate: parseFloat(parts[10]), // 换手率
      };
    });
  }

  // 转换为CustomStockData格式
  private convertToCustomStockData(symbol: string, name: string, klineData: KLineData[]): CustomStockData {
    // 按日期排序（从旧到新）
    klineData.sort((a, b) => a.date.localeCompare(b.date));

    const dates: string[] = [];
    const opens: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const closes: number[] = [];
    const volumes: number[] = [];

    klineData.forEach(item => {
      dates.push(item.date);
      opens.push(item.open);
      highs.push(item.high);
      lows.push(item.low);
      closes.push(item.close);
      volumes.push(item.volume);
    });

    return {
      symbol: symbol,
      name: name,
      data: {
        date: dates,
        opens: opens,
        highs: highs,
        lows: lows,
        closes: closes,
        volumes: volumes,
        // 添加额外的技术指标数据字段
        turnover: klineData.map(item => item.turnover),
        amplitude: klineData.map(item => item.amplitude),
        changePercent: klineData.map(item => item.changePercent),
        changeAmount: klineData.map(item => item.changeAmount),
        turnoverRate: klineData.map(item => item.turnoverRate),
      }
    };
  }
}

// 数据适配器工厂
export class DataAdapterFactory {
  private adapters: Map<string, DataAdapter> = new Map();

  constructor() {
    // 注册默认的适配器
    this.registerAdapter(new EastMoneyDataAdapter());
  }

  // 注册适配器
  registerAdapter(adapter: DataAdapter): void {
    this.adapters.set(adapter.getAdapterName(), adapter);
  }

  // 获取适配器
  getAdapter(name?: string): DataAdapter {
    if (name) {
      const adapter = this.adapters.get(name);
      if (adapter) {
        return adapter;
      }
      throw new Error(`Adapter not found: ${name}`);
    }

    // 如果没有指定名称，返回第一个可用的适配器
    const availableAdapters = Array.from(this.adapters.values());
    if (availableAdapters.length === 0) {
      throw new Error('No adapters available');
    }
    return availableAdapters[0];
  }

  // 根据股票代码自动选择适配器
  autoSelectAdapter(symbol: string): DataAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.isSupported(symbol)) {
        return adapter;
      }
    }
    throw new Error(`No adapter found for symbol: ${symbol}`);
  }

  // 获取所有适配器名称
  getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// 便捷的数据获取服务
export class StockDataService {
  private adapterFactory: DataAdapterFactory;

  constructor(adapterFactory?: DataAdapterFactory) {
    this.adapterFactory = adapterFactory || new DataAdapterFactory();
  }

  // 获取股票数据
  async getStockData(
    symbol: string, 
    startDate: string, 
    endDate: string, 
    adapterName?: string
  ): Promise<CustomStockData> {
    const adapter = adapterName 
      ? this.adapterFactory.getAdapter(adapterName)
      : this.adapterFactory.autoSelectAdapter(symbol);

    return adapter.fetchData(symbol, startDate, endDate);
  }

  // 批量获取股票数据
  async getBatchStockData(
    symbols: string[],
    startDate: string,
    endDate: string,
    adapterName?: string
  ): Promise<CustomStockData[]> {
    const results: CustomStockData[] = [];
    
    for (const symbol of symbols) {
      try {
        const data = await this.getStockData(symbol, startDate, endDate, adapterName);
        results.push(data);
      } catch (error) {
        console.error(`Failed to fetch data for ${symbol}:`, error);
        // 继续处理其他股票
      }
    }
    
    return results;
  }

  // 获取适配器工厂
  getAdapterFactory(): DataAdapterFactory {
    return this.adapterFactory;
  }
}

// 导出单例实例
export const stockDataService = new StockDataService();
export const dataAdapterFactory = new DataAdapterFactory();

// 便捷函数
export async function fetchStockData(
  symbol: string, 
  startDate: string, 
  endDate: string
): Promise<CustomStockData> {
  return stockDataService.getStockData(symbol, startDate, endDate);
}

export async function fetchMultipleStockData(
  symbols: string[], 
  startDate: string, 
  endDate: string
): Promise<CustomStockData[]> {
  return stockDataService.getBatchStockData(symbols, startDate, endDate);
}