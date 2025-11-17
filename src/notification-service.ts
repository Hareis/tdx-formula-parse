// 跨平台消息通知模块 - 支持Mac和Windows系统

export interface NotificationOptions {
  title: string;
  message: string;
  subtitle?: string;
  sound?: boolean;
  timeout?: number; // 超时时间（毫秒）
  urgency?: 'low' | 'normal' | 'critical'; // 紧急程度
  icon?: string; // 图标路径
}

export interface NotificationResult {
  success: boolean;
  error?: string;
  platform?: string;
}

export abstract class NotificationProvider {
  abstract isSupported(): boolean;
  abstract sendNotification(options: NotificationOptions): Promise<NotificationResult>;
  abstract getName(): string;
}

// Mac系统通知提供者 (使用osascript)
class MacNotificationProvider extends NotificationProvider {
  isSupported(): boolean {
    return process.platform === 'darwin';
  }

  async sendNotification(options: NotificationOptions): Promise<NotificationResult> {
    try {
      const { spawn } = require('child_process');
      
      let script = `display notification "${this.escapeString(options.message)}"`;
      
      if (options.title) {
        script += ` with title "${this.escapeString(options.title)}"`;
      }
      
      if (options.subtitle) {
        script += ` subtitle "${this.escapeString(options.subtitle)}"`;
      }
      
      if (options.sound) {
        script += ' sound name "default"';
      }

      return new Promise((resolve) => {
        const child = spawn('osascript', ['-e', script]);
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, platform: 'macOS' });
          } else {
            resolve({ success: false, error: 'Failed to send notification', platform: 'macOS' });
          }
        });
        
        child.on('error', (error) => {
          resolve({ success: false, error: error.message, platform: 'macOS' });
        });
        
        // 设置超时
        if (options.timeout) {
          setTimeout(() => {
            if (!child.killed) {
              child.kill();
              resolve({ success: false, error: 'Timeout', platform: 'macOS' });
            }
          }, options.timeout);
        }
      });
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        platform: 'macOS'
      };
    }
  }

  getName(): string {
    return 'macOS Notification Center';
  }

  private escapeString(str: string): string {
    return str.replace(/"/g, '\\"');
  }
}

// Windows系统通知提供者 (使用powershell)
class WindowsNotificationProvider extends NotificationProvider {
  isSupported(): boolean {
    return process.platform === 'win32';
  }

  async sendNotification(options: NotificationOptions): Promise<NotificationResult> {
    try {
      const { spawn } = require('child_process');
      
      let script = `
Add-Type -AssemblyName System.Windows.Forms
$notification = New-Object System.Windows.Forms.NotifyIcon
$notification.Icon = [System.Drawing.SystemIcons]::Information
$notification.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
$notification.BalloonTipTitle = "${this.escapeString(options.title)}"
$notification.BalloonTipText = "${this.escapeString(options.message)}"
$notification.Visible = $true
$notification.ShowBalloonTip(5000)
Start-Sleep -Seconds 6
$notification.Dispose()
`;

      return new Promise((resolve) => {
        const child = spawn('powershell', ['-Command', script]);
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, platform: 'Windows' });
          } else {
            resolve({ success: false, error: 'Failed to send notification', platform: 'Windows' });
          }
        });
        
        child.on('error', (error) => {
          resolve({ success: false, error: error.message, platform: 'Windows' });
        });
        
        // 设置超时
        if (options.timeout) {
          setTimeout(() => {
            if (!child.killed) {
              child.kill();
              resolve({ success: false, error: 'Timeout', platform: 'Windows' });
            }
          }, options.timeout);
        }
      });
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        platform: 'Windows'
      };
    }
  }

  getName(): string {
    return 'Windows Balloon Tips';
  }

  private escapeString(str: string): string {
    return str.replace(/`/g, '\`').replace(/\$/g, '\\$');
  }
}

// 浏览器通知提供者 (用于Node.js环境)
class BrowserNotificationProvider extends NotificationProvider {
  private hasPermission: boolean = false;

  isSupported(): boolean {
    // 检查是否在浏览器环境或支持Node.js的桌面环境
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  async sendNotification(options: NotificationOptions): Promise<NotificationResult> {
    try {
      if (!this.isSupported()) {
        return { success: false, error: 'Browser notifications not supported', platform: 'Browser' };
      }

      // 请求权限
      if (!this.hasPermission) {
        const permission = await Notification.requestPermission();
        this.hasPermission = permission === 'granted';
      }

      if (!this.hasPermission) {
        return { success: false, error: 'Notification permission denied', platform: 'Browser' };
      }

      const notification = new Notification(options.title, {
        body: options.message,
        icon: options.icon,
        tag: 'technical-formula-parser'
      });

      notification.onclick = () => {
        notification.close();
      };

      // 自动关闭
      if (options.timeout) {
        setTimeout(() => {
          notification.close();
        }, options.timeout);
      }

      return { success: true, platform: 'Browser' };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        platform: 'Browser'
      };
    }
  }

  getName(): string {
    return 'Browser Notifications';
  }
}

// 控制台通知提供者 (备用方案)
class ConsoleNotificationProvider extends NotificationProvider {
  isSupported(): boolean {
    return true; // 控制台通知总是可用的
  }

  async sendNotification(options: NotificationOptions): Promise<NotificationResult> {
    try {
      console.log(`\n📢 ${options.title}`);
      if (options.subtitle) {
        console.log(`📝 ${options.subtitle}`);
      }
      console.log(`💬 ${options.message}`);
      console.log('---\n');
      
      return { success: true, platform: 'Console' };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        platform: 'Console'
      };
    }
  }

  getName(): string {
    return 'Console Output';
  }
}

// 主通知服务类
export class NotificationService {
  private providers: NotificationProvider[] = [];
  private defaultProvider: NotificationProvider | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // 根据平台添加合适的提供者
    this.providers.push(new MacNotificationProvider());
    this.providers.push(new WindowsNotificationProvider());
    this.providers.push(new BrowserNotificationProvider());
    this.providers.push(new ConsoleNotificationProvider());
    
    // 设置默认提供者
    this.defaultProvider = this.findBestProvider();
  }

  private findBestProvider(): NotificationProvider | null {
    for (const provider of this.providers) {
      if (provider.isSupported()) {
        return provider;
      }
    }
    return null;
  }

  // 发送通知
  async sendNotification(options: NotificationOptions): Promise<NotificationResult> {
    if (!this.defaultProvider) {
      return { success: false, error: 'No notification provider available' };
    }

    try {
      const result = await this.defaultProvider.sendNotification(options);
      
      // 如果默认提供者失败，尝试其他提供者
      if (!result.success && this.providers.length > 1) {
        for (const provider of this.providers) {
          if (provider !== this.defaultProvider && provider.isSupported()) {
            const fallbackResult = await provider.sendNotification(options);
            if (fallbackResult.success) {
              console.warn(`Fallback to ${provider.getName()} succeeded`);
              return fallbackResult;
            }
          }
        }
      }
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 批量发送通知
  async sendMultipleNotifications(notifications: NotificationOptions[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    for (const notification of notifications) {
      const result = await this.sendNotification(notification);
      results.push(result);
      
      // 添加延迟以避免通知过快
      await this.delay(1000);
    }
    
    return results;
  }

  // 获取可用提供者列表
  getAvailableProviders(): { name: string; supported: boolean }[] {
    return this.providers.map(provider => ({
      name: provider.getName(),
      supported: provider.isSupported()
    }));
  }

  // 设置特定提供者
  setProvider(providerName: string): boolean {
    const provider = this.providers.find(p => 
      p.getName().toLowerCase().includes(providerName.toLowerCase())
    );
    
    if (provider && provider.isSupported()) {
      this.defaultProvider = provider;
      return true;
    }
    
    return false;
  }

  // 测试通知功能
  async testNotification(): Promise<NotificationResult> {
    return this.sendNotification({
      title: '技术指标公式解析器',
      message: '通知功能测试成功！',
      subtitle: '系统通知服务已就绪',
      sound: true
    });
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取当前平台信息
  getPlatformInfo(): { platform: string; arch: string; nodeVersion: string } {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    };
  }
}

// 创建全局通知服务实例
let globalNotificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!globalNotificationService) {
    globalNotificationService = new NotificationService();
  }
  return globalNotificationService;
}

// 快捷函数
export async function notify(options: NotificationOptions): Promise<NotificationResult> {
  const service = getNotificationService();
  return service.sendNotification(options);
}

export async function notifySuccess(message: string, title: string = '成功'): Promise<NotificationResult> {
  return notify({
    title,
    message,
    sound: true
  });
}

export async function notifyError(message: string, title: string = '错误'): Promise<NotificationResult> {
  return notify({
    title,
    message,
    urgency: 'critical'
  });
}

export async function notifyWarning(message: string, title: string = '警告'): Promise<NotificationResult> {
  return notify({
    title,
    message,
    urgency: 'normal'
  });
}

export async function notifyInfo(message: string, title: string = '信息'): Promise<NotificationResult> {
  return notify({
    title,
    message,
    urgency: 'low'
  });
}

// 公式计算相关通知
export async function notifyFormulaCalculationStart(formulaName: string): Promise<NotificationResult> {
  return notifyInfo(`开始计算公式: ${formulaName}`, '公式计算');
}

export async function notifyFormulaCalculationComplete(formulaName: string, duration: number): Promise<NotificationResult> {
  return notifySuccess(`公式 ${formulaName} 计算完成，耗时 ${duration}ms`, '公式计算完成');
}

export async function notifyFormulaCalculationError(formulaName: string, error: string): Promise<NotificationResult> {
  return notifyError(`公式 ${formulaName} 计算失败: ${error}`, '公式计算错误');
}

// 示例使用方式
/*
// 基本使用
const notificationService = getNotificationService();

// 发送简单通知
await notificationService.sendNotification({
  title: '技术指标计算完成',
  message: 'MA(5) 指标已成功计算',
  sound: true
});

// 使用快捷函数
await notifySuccess('数据加载完成');
await notifyError('公式解析失败：语法错误');

// 公式计算相关通知
await notifyFormulaCalculationStart('MA_CROSS_STRATEGY');
await notifyFormulaCalculationComplete('MA_CROSS_STRATEGY', 1500);
*/