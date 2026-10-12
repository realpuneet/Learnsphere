import authR from '../routes/auth.routes.js';
import usersR from '../routes/user.routes.js';
import instructorR from '../routes/instructor.routes.js';
import adminR from '../routes/admin.routes.js';
import paymentsR from '../routes/payment.routes.js';
import catalogR from '../routes/catalog.routes.js';
import learningR from '../routes/learning.routes.js';

const mounts = [
  ['/auth', authR, 'Auth'],
  ['/me', usersR, 'Account'],
  ['/instructor', instructorR, 'Instructor'],
  ['/admin', adminR, 'Admin'],
  ['/payments', paymentsR, 'Payments'],
  ['', catalogR, 'Catalog'],
  ['', learningR, 'Learning'],
];

/** Build the OpenAPI path table from the live Express routers so docs can never drift from the code. */
function buildPaths() {
  const paths = {};
  for (const [prefix, router, tag] of mounts) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const p = (prefix + layer.route.path).replace(/:([A-Za-z]+)/g, '{$1}');
      for (const method of Object.keys(layer.route.methods)) {
        paths[p] = paths[p] || {};
        paths[p][method] = { tags: [tag], summary: `${method.toUpperCase()} ${p}`, responses: { 200: { description: 'OK' } } };
      }
    }
  }
  return paths;
}

export const openapi = {
  openapi: '3.0.3',
  info: { title: 'LearnSphere API', version: '1.0.0', description: 'Envelope: { success, message, data, meta }. Auth: Bearer access token; refresh via httpOnly cookie.' },
  servers: [{ url: '/api/v1' }],
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
  security: [{ bearer: [] }],
  paths: buildPaths(),
};
