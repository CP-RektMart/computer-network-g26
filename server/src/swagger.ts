import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'A simple Express API',
    },
  },
  apis: ['./src/**/*.ts'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
export default swaggerDocs;
