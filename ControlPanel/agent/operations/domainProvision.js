import path from 'path';
import { runtimeRoot, ensureDir, renderTemplate, writeFile } from './utils.js';
import { readState, updateState } from '../../orchestrator/stateStore.js';

const templatesRoot = path.join(process.cwd(), 'templates');

export const provisionDomain = async ({ domainId }) => {
  if (!domainId) {
    throw new Error('domainId is required');
  }
  const state = await readState();
  const domain = state.domains.find((entry) => entry.id === domainId);
  if (!domain) {
    throw new Error(`Domain ${domainId} not found in state.`);
  }
  const tenantRoot = path.join(runtimeRoot, 'tenants', domain.tenantId);
  const docroot = domain.docroot || path.join(tenantRoot, 'www', domain.name);
  await ensureDir(docroot);

  const vhostConfig = await renderTemplate(path.join(templatesRoot, 'nginx.vhost.conf'), {
    server_name: domain.name,
    docroot,
    tenant_id: domain.tenantId,
    php_socket: domain.phpSocket || '/run/php/php-fpm.sock',
  });
  const vhostPath = path.join(runtimeRoot, 'vhosts', `${domain.name}.conf`);
  await writeFile(vhostPath, vhostConfig);

  const zoneConfig = await renderTemplate(path.join(templatesRoot, 'bind.zone'), {
    zone: domain.name,
    primary_ip: domain.primaryIp || '127.0.0.1',
    admin_email: domain.adminEmail || `admin.${domain.name}`,
  });
  const zonePath = path.join(runtimeRoot, 'zones', `${domain.name}.zone`);
  await writeFile(zonePath, zoneConfig);

  await updateState((current) => {
    const target = current.domains.find((entry) => entry.id === domainId);
    if (target) {
      target.provisionedAt = new Date().toISOString();
      target.status = 'active';
      target.docroot = docroot;
    }
    return current;
  });

  return { docroot, vhostPath, zonePath };
};
