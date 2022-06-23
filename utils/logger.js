/**
 * Configurations of logger.
 */
 const { createLogger, format, transports } = require('winston');
 const { combine, timestamp, prettyPrint } = format;
 // const winston = require('winston');

//
 const successLogger = createLogger({
  level: 'info',
  format: combine (format.json(), timestamp(), prettyPrint()),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new transports.File({ filename: 'log/info.log', level: 'info' }),
    new transports.File({ filename: 'log/combined.log' }),
  ],
   exitOnError: false,
});
 
 const errorLogger = createLogger({
  level: 'error',
   format: combine (format.json(), timestamp(), prettyPrint()),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new transports.File({ filename: 'log/error.log', level: 'error' }),
    new transports.File({ filename: 'log/combined.log' }),
  ],
   exitOnError: false,
});
 
 module.exports = {
   'successlog': successLogger,
   'errorlog': errorLogger
 };