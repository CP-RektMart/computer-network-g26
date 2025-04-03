import * as express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const logLevel: string = process.env.LOG_REQUESTS || '';

const requestLogger = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  if (logLevel === 'FULL') {
    const timestamp = new Date().toISOString();
    console.log('Request Details:');
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Method: ${req.method}`);
    console.log(`Path: ${req.originalUrl}`);
    console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
    if (req.method === 'POST' || req.method === 'PUT') {
      console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);
    }
    console.log(`Query Params: ${JSON.stringify(req.query, null, 2)}`);
    console.log('-------------');
  } else if (logLevel === 'SMALL') {
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
    );
  }
  next();
};

export default requestLogger;
