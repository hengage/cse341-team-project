import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Kizuna Rail API',
            version: '1.0.0',
            description: 'API documentation for Kizuna Rail'
        }
    },
    apis: ['./src/routes/api-routes.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
