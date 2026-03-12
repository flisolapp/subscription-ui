export {};

declare global {
  interface Window {
    flutter_inappwebview?: {
      callHandler(name: string, ...args: any[]): Promise<any>;
    };
  }
}
