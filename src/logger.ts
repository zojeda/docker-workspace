import winston = require("winston");


export function loggerFactory(label: string, output: NodeJS.WritableStream): winston.LoggerInstance {
  return new (winston.Logger)({
    transports: [
      new winston.transports.Console({
        colorize: true,
        level: "info",
        label: label
      })
    ]
  })
}