/* eslint-disable */
// Assistance for debugging
export class Logger {
  private context: string;
  private colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    gray: "\x1b[90m",
    bold: "\x1b[1m",
  };

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `${timestamp} ${this.context}`;
    return `${prefix} ${message} ${data ? data : ""}`;
  }

  private colorize(color: keyof typeof this.colors, text: string): string {
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  private formatLogLevel(level: string): string {
    return `[${level.toUpperCase()}]`;
  }

  private formatOutput(level: string, message: string, data?: any): void {
    const formattedLevel = this.formatLogLevel(level);
    const formattedMessage = this.formatMessage(formattedLevel, message, data);

    switch (level.toLowerCase()) {
      case "error":
        console.error(this.colorize("red", formattedMessage));
        break;
      case "warn":
        console.warn(this.colorize("yellow", formattedMessage));
        break;
      case "info":
        console.info(this.colorize("blue", formattedMessage));
        break;
      case "debug":
        console.debug(this.colorize("gray", formattedMessage));
        break;
      default:
        console.log(formattedMessage);
    }
  }

  // Public logging methods
  log(message: string, data?: any): void {
    this.formatOutput("log", message, data);
  }

  error(message: string, data?: any): void {
    this.formatOutput("error", message, data);
  }

  warn(message: string, data?: any): void {
    this.formatOutput("warn", message, data);
  }

  info(message: string, data?: any): void {
    this.formatOutput("info", message, data);
  }

  debug(message: string, data?: any): void {
    this.formatOutput("debug", message, data);
  }
}
