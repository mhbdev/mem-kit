import {ILogger, LogLevel} from "../../domain/ports/ILogger";

export class ConsoleLogger implements ILogger {
    log(level: LogLevel, message: string, meta?: any): void {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
    }

    debug(message: string, meta?: any): void {
        this.log("debug", message, meta);
    }

    info(message: string, meta?: any): void {
        this.log("info", message, meta);
    }

    warn(message: string, meta?: any): void {
        this.log("warn", message, meta);
    }

    error(message: string, meta?: any): void {
        this.log("error", message, meta);
    }
}
