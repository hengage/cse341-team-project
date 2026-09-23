import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kizuna Rail API',
      version: '1.0.0',
      description: 'API documentation for Kizuna Rail',
    },
  },
  // Paths to files containing OpenAPI definitions
  apis: ['./src/routes/api/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
