import * as express from 'express';

// 404 Handler
const handle404 = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  res.status(404).json({ error: 'Not Found' });
};

// Global Error Handler
const handleError = (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  const statusCode = err.status || 500;

  if (statusCode === 500) {
    console.error('❌ Internal Server Error occurred!');
  }
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  res.status(statusCode).json({
    error:
      statusCode === 500
        ? 'Internal Server Error'
        : err.message || 'An error occurred',
  });
};

export { handle404, handleError };
