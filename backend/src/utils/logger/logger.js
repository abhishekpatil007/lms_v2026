import { createLogger, format, transports } from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}
export function createModuleLogger(moduleName, options = {}) {
    const { errorsOnly = false } = options;

    const fileTransports = [
        new transports.File({
            filename: path.join(logDir, `${moduleName}${errorsOnly ? '_error' : ''}.log`),
            level: errorsOnly ? 'error' : 'info',
        })
    ];

    return createLogger({
        level: errorsOnly ? 'error' : 'info',
        format: format.combine(
            format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS' }),
            format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] - ${message}`)
        ),
        transports: [
            ...fileTransports,
            new transports.Console()
        ],
    });
}
