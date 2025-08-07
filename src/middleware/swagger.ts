/**
 * Swagger UI Middleware Configuration
 * Sets up interactive API documentation with authentication testing
 */

import { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';

// Load OpenAPI specification with fallback
let swaggerDocument: any = null;
const openApiPath = path.join(__dirname, '../../docs/openapi.yaml');

try {
  if (fs.existsSync(openApiPath)) {
    swaggerDocument = YAML.load(openApiPath);
  } else {
    console.warn('OpenAPI specification not found at:', openApiPath);
    // Create a minimal OpenAPI spec as fallback
    swaggerDocument = {
      openapi: '3.0.0',
      info: {
        title: 'KCT Knowledge API',
        version: '2.0.0',
        description: 'AI-powered fashion intelligence API'
      },
      servers: [
        { url: '/api', description: 'API Server' }
      ],
      paths: {},
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }
      }
    };
  }
} catch (error) {
  console.error('Error loading OpenAPI specification:', error);
  // Use minimal spec as fallback
  swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'KCT Knowledge API',
      version: '2.0.0',
      description: 'AI-powered fashion intelligence API'
    },
    servers: [
      { url: '/api', description: 'API Server' }
    ],
    paths: {},
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  };
}

// Custom CSS for branding
const customCss = `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info .title { color: #1a365d; font-size: 2.5rem; }
  .swagger-ui .info .description { font-size: 1.1rem; line-height: 1.6; }
  .swagger-ui .scheme-container { background: #f7fafc; padding: 20px; border-radius: 8px; }
  .swagger-ui .auth-wrapper { background: #ebf8ff; padding: 15px; border-radius: 8px; }
  .swagger-ui .btn.authorize { background-color: #3182ce; border-color: #3182ce; }
  .swagger-ui .btn.authorize:hover { background-color: #2c5aa0; border-color: #2c5aa0; }
  .swagger-ui .auth-btn-wrapper { display: flex; justify-content: center; padding: 20px 0; }
  .swagger-ui .info { margin-bottom: 30px; }
  .swagger-ui .wrapper { max-width: 1200px; margin: 0 auto; }
  
  /* Custom header */
  .custom-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 0;
    text-align: center;
    margin-bottom: 30px;
  }
  
  .custom-header h1 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 300;
  }
  
  .custom-header p {
    margin: 10px 0 0 0;
    font-size: 1.1rem;
    opacity: 0.9;
  }
  
  /* Operation colors by tag */
  .swagger-ui .opblock.opblock-get { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
  .swagger-ui .opblock.opblock-post { border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
  .swagger-ui .opblock.opblock-put { border-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
  .swagger-ui .opblock.opblock-delete { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
  
  /* Response examples */
  .swagger-ui .responses-wrapper { margin-top: 20px; }
  .swagger-ui .response-col_status { font-weight: 600; }
  
  /* Try it out button */
  .swagger-ui .btn.try-out__btn { 
    background: #10b981; 
    border-color: #10b981; 
    color: white;
  }
  
  .swagger-ui .btn.try-out__btn:hover { 
    background: #059669; 
    border-color: #059669; 
  }
  
  /* Execute button */
  .swagger-ui .btn.execute { 
    background: #3b82f6; 
    border-color: #3b82f6; 
    color: white;
  }
  
  .swagger-ui .btn.execute:hover { 
    background: #2563eb; 
    border-color: #2563eb; 
  }
`;

// Custom site title and favicon options
const swaggerOptions = {
  customCss,
  customSiteTitle: 'KCT Knowledge API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true,
    requestInterceptor: (req: any) => {
      // Add custom headers or modify requests here
      return req;
    },
    responseInterceptor: (res: any) => {
      // Process responses here
      return res;
    }
  }
};

// Add custom HTML for header
const customHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>KCT Knowledge API Documentation</title>
  <link rel="stylesheet" type="text/css" href="./swagger-ui-bundle.css" />
  <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" />
  <link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16" />
  <style>
    ${customCss}
  </style>
</head>
<body>
  <div class="custom-header">
    <h1>KCT Knowledge API</h1>
    <p>Comprehensive Menswear Styling Intelligence</p>
  </div>
  <div id="swagger-ui"></div>
  <script src="./swagger-ui-bundle.js"></script>
  <script src="./swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: './openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        tryItOutEnabled: true,
        requestInterceptor: function(request) {
          // Add timestamp to requests
          console.log('API Request:', request);
          return request;
        },
        responseInterceptor: function(response) {
          // Log responses for debugging
          console.log('API Response:', response);
          return response;
        },
        onComplete: function() {
          // Custom initialization after Swagger UI loads
          console.log('KCT Knowledge API Documentation loaded');
          
          // Add custom authentication helper
          if (localStorage.getItem('kct-api-key')) {
            const apiKey = localStorage.getItem('kct-api-key');
            ui.preauthorizeApiKey('ApiKeyAuth', apiKey);
          }
        }
      });
      
      // Custom authentication helper
      window.setApiKey = function(apiKey) {
        localStorage.setItem('kct-api-key', apiKey);
        ui.preauthorizeApiKey('ApiKeyAuth', apiKey);
        alert('API Key set successfully! You can now test the endpoints.');
      };
      
      // Add authentication guide
      const authGuide = document.createElement('div');
      authGuide.innerHTML = \`
        <div style="background: #f0f8ff; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #0c5460; margin-top: 0;">🔐 Authentication Guide</h3>
          <p>To test the API endpoints, you need an API key:</p>
          <ol>
            <li>Click the <strong>"Authorize"</strong> button above</li>
            <li>Enter your API key in the <strong>X-API-Key</strong> field</li>
            <li>Click <strong>"Authorize"</strong> to save your key</li>
            <li>Now you can test all endpoints using the <strong>"Try it out"</strong> buttons</li>
          </ol>
          <p><strong>Demo API Key for testing:</strong> <code>demo_api_key_12345</code></p>
          <p><em>Note: This demo key provides access to sample data for testing purposes.</em></p>
        </div>
      \`;
      
      // Insert auth guide after the info section
      setTimeout(() => {
        const infoSection = document.querySelector('.swagger-ui .info');
        if (infoSection && infoSection.parentNode) {
          infoSection.parentNode.insertBefore(authGuide, infoSection.nextSibling);
        }
      }, 1000);
    };
  </script>
</body>
</html>
`;

// Enhanced swagger setup with authentication testing
export const setupSwagger = (app: any) => {
  // Serve OpenAPI spec
  app.get('/docs/openapi.yaml', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/yaml');
    res.send(YAML.stringify(swaggerDocument, 4));
  });

  // Serve custom documentation page
  app.get('/docs', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(customHtml);
  });

  // Alternative route for API docs
  app.get('/api-docs', (req: Request, res: Response) => {
    res.redirect('/docs');
  });

  // Serve static swagger-ui assets
  app.use('/docs', swaggerUi.serveFiles(swaggerDocument, swaggerOptions));

  // Health check for documentation
  app.get('/docs/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      documentation: 'available',
      openapi_version: swaggerDocument.openapi,
      api_version: swaggerDocument.info.version,
      endpoints_documented: Object.keys(swaggerDocument.paths).length,
      last_updated: new Date().toISOString()
    });
  });

  // API specification endpoint for programmatic access
  app.get('/docs/spec', (req: Request, res: Response) => {
    res.json(swaggerDocument);
  });

  // Postman collection generator
  app.get('/docs/postman', (req: Request, res: Response) => {
    const postmanCollection = generatePostmanCollection(swaggerDocument);
    res.json(postmanCollection);
  });

  console.log('📚 Swagger UI documentation available at: /docs');
  console.log('📋 OpenAPI specification available at: /docs/openapi.yaml');
  console.log('🔧 Postman collection available at: /docs/postman');
};

// Generate Postman collection from OpenAPI spec
function generatePostmanCollection(spec: any) {
  const collection = {
    info: {
      name: spec.info.title,
      description: spec.info.description,
      version: spec.info.version,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    auth: {
      type: 'apikey',
      apikey: [
        {
          key: 'key',
          value: 'X-API-Key',
          type: 'string'
        },
        {
          key: 'value',
          value: '{{api_key}}',
          type: 'string'
        },
        {
          key: 'in',
          value: 'header',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'base_url',
        value: 'https://api.kctmenswear.com/v2',
        type: 'string'
      },
      {
        key: 'api_key',
        value: 'your_api_key_here',
        type: 'string'
      }
    ],
    item: generatePostmanRequests(spec.paths)
  };

  return collection;
}

function generatePostmanRequests(paths: any) {
  const items: any[] = [];

  Object.entries(paths).forEach(([path, methods]: [string, any]) => {
    Object.entries(methods).forEach(([method, operation]: [string, any]) => {
      if (method === 'parameters') return; // Skip path-level parameters

      const item = {
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
              type: 'text'
            }
          ],
          url: {
            raw: `{{base_url}}${path}`,
            host: ['{{base_url}}'],
            path: path.split('/').filter(Boolean)
          },
          description: operation.description || operation.summary
        }
      };

      // Add request body for POST/PUT requests
      if (operation.requestBody && ['post', 'put', 'patch'].includes(method)) {
        const schema = operation.requestBody.content?.['application/json']?.schema;
        const example = operation.requestBody.content?.['application/json']?.example;
        
        if (example) {
          (item.request as any).body = {
            mode: 'raw',
            raw: JSON.stringify(example, null, 2),
            options: {
              raw: {
                language: 'json'
              }
            }
          };
        }
      }

      // Add query parameters
      if (operation.parameters) {
        const queryParams = operation.parameters
          .filter((param: any) => param.in === 'query')
          .map((param: any) => ({
            key: param.name,
            value: param.example || '',
            description: param.description,
            disabled: !param.required
          }));

        if (queryParams.length > 0) {
          (item.request.url as any).query = queryParams;
        }
      }

      items.push(item);
    });
  });

  return items;
}

// Middleware to add API documentation links to responses
export const addDocumentationLinks = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Add documentation links to API responses
    if (data && typeof data === 'object' && data.success !== undefined) {
      data._links = {
        documentation: `${req.protocol}://${req.get('host')}/docs`,
        openapi_spec: `${req.protocol}://${req.get('host')}/docs/openapi.yaml`,
        postman_collection: `${req.protocol}://${req.get('host')}/docs/postman`
      };
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

export default setupSwagger;