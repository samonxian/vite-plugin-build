export const restoreConsole = { ...console };

export class InterceptConsole {
  public log: typeof console.log;
  public warn: typeof console.warn;
  public clear: typeof console.clear;

  constructor() {
    const { log, warn } = console;
    this.log = log;
    this.warn = warn;
  }

  silent() {
    console.log = () => {};
    console.warn = () => {};
  }

  restore() {
    console.log = this.log;
    console.warn = this.warn;
  }
}
