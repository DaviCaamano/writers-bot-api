import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from '@/config/openapi';

const router = Router();

// Cache the document so it is only generated once
let cachedDocument: ReturnType<typeof generateOpenApiDocument> | null = null;
function getDocument() {
  if (!cachedDocument) cachedDocument = generateOpenApiDocument();
  return cachedDocument;
}

router.get('/api-spec.json', (_req, res) => {
  res.json(getDocument());
});

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(undefined, { swaggerOptions: { url: '/docs/api-spec.json' } }));

export default router;
