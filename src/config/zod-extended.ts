/**
 * Single source of truth for the extended `z`.
 *
 * @asteasolutions/zod-to-openapi wraps Zod's factory methods so that every
 * schema created *after* extendZodWithOpenApi() carries an .openapi() method
 * as an own property. Schemas created before the call will NOT have it.
 *
 * By re-exporting `z` from here, every schema file that imports this module
 * is guaranteed to receive the already-extended version.
 */
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export { z };
