import winston = require("winston");


export let logger = new (winston.Logger)({
  transports: [
    // new (winston.transports.File)({
    //   name: "info-file",
    //   filename: "filelog-info.log",
    //   level: "info"
    // }),
    // new (winston.transports.File)({
    //   name: "error-file",
    //   filename: "filelog-error.log",
    //   level: "error"
    // }),
    new winston.transports.Console({
      colorize: true,
      level: "debug",
      timestamp: function() {
        return new Date().toISOString();
      }})
  ]
});