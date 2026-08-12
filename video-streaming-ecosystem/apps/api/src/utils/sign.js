import crypto from 'crypto';

const SECRET = process.env.STREAM_SIGN_SECRET || 'change-this-to-long-random-secret';

/**
 * Generate signed stream URL
 * @param {string} uuid 
 * @param {number} expiresInSeconds - default 6 hours
 */
export function generateSignedUrl(uuid, expiresInSeconds = 6 * 60 * 60) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${uuid}:${exp}`;
  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');

  const workerUrl = process.env.WORKER_PUBLIC_URL || 'http://localhost:8787';

  return {
    uuid,
    exp,
    sig,
    url: `${workerUrl}/api/media?uuid=${uuid}&exp=${exp}&sig=${sig}`,
  };
}

/**
 * Verify signature
 */
export function verifySignature(uuid, exp, sig) {
  if (!uuid || !exp || !sig) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Number(exp) < now) return false; // expired

  const payload = `${uuid}:${exp}`;
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expected)
  );
}
