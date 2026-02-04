import path from 'path';
import { runtimeRoot, ensureDir, writeFile } from './utils.js';
import { readState, updateState } from '../../orchestrator/stateStore.js';

export const issueCertificate = async ({ certificateId }) => {
  if (!certificateId) {
    throw new Error('certificateId is required');
  }
  const state = await readState();
  const certificate = state.certificates.find((entry) => entry.id === certificateId);
  if (!certificate) {
    throw new Error(`Certificate ${certificateId} not found in state.`);
  }
  const certDir = path.join(runtimeRoot, 'certs', certificate.domain);
  await ensureDir(certDir);

  const placeholder = `-----BEGIN CERTIFICATE-----
FAKE-CERTIFICATE-FOR-${certificate.domain}
-----END CERTIFICATE-----`;
  const placeholderKey = `-----BEGIN PRIVATE KEY-----
FAKE-PRIVATE-KEY-FOR-${certificate.domain}
-----END PRIVATE KEY-----`;

  await writeFile(path.join(certDir, 'fullchain.pem'), placeholder);
  await writeFile(path.join(certDir, 'privkey.pem'), placeholderKey);

  await updateState((current) => {
    const target = current.certificates.find((entry) => entry.id === certificateId);
    if (target) {
      target.issuedAt = new Date().toISOString();
      target.status = 'issued';
    }
    return current;
  });

  return { certDir };
};
