import winston from 'winston';

// 创建 Winston logger 实例 - 仅用于服务器端
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      
      // 如果有额外的元数据，格式化输出
      if (Object.keys(meta).length > 0) {
        logMessage += ` ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    })
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// 在生产环境中调整日志级别
if (process.env.NODE_ENV === 'production') {
  logger.level = 'warn';
} else if (process.env.DEBUG === 'true') {
  logger.level = 'debug';
}

// 服务器端日志函数
export function serverLog(message: string, ...args: unknown[]) {
  if (args.length > 0) {
    logger.info(message, { metadata: args });
  } else {
    logger.info(message);
  }
}

export function serverDebug(message: string, ...args: unknown[]) {
  if (args.length > 0) {
    logger.debug(message, { metadata: args });
  } else {
    logger.debug(message);
  }
}

export function serverError(message: string, ...args: unknown[]) {
  if (args.length > 0) {
    logger.error(message, { metadata: args });
  } else {
    logger.error(message);
  }
}

export function serverWarn(message: string, ...args: unknown[]) {
  if (args.length > 0) {
    logger.warn(message, { metadata: args });
  } else {
    logger.warn(message);
  }
}

export default logger;