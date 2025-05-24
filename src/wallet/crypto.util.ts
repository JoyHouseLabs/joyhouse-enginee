import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM

export function encrypt(
  text: string,
  password: string,
): { cipher: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(password, 'wallet_salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return {
    cipher: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decrypt(
  encrypted: { cipher: string; iv: string; tag: string },
  password: string,
): string {
  const key = crypto.scryptSync(password, 'wallet_salt', 32);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(encrypted.iv, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
  let decrypted = decipher.update(encrypted.cipher, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
