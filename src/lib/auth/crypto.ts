/**
 * Cryptographic helper for secure client and server password hashing
 */
export async function hashPassword(password: string): Promise<string> {
  const salted = password + ':zawr-books-secure-salt-v1';
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(salted);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(salted).digest('hex');
  }
}
