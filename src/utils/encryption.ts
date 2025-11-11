/**
 * End-to-End Encryption Utilities
 * 
 * Uses AES-GCM encryption via Web Crypto API for maximum security.
 * Key is derived from user's password using PBKDF2.
 * 
 * IMPORTANT: If user forgets password, encrypted data is permanently lost!
 */

import { supabase } from '@/integrations/supabase/client';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return arrayBufferToBase64(salt.buffer);
}

/**
 * Derive an encryption key from a password and salt
 */
async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = base64ToArrayBuffer(salt);

  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt text data
 * @returns Object with encrypted data and IV
 */
export async function encryptData(
  plaintext: string,
  password: string,
  salt: string
): Promise<{ encrypted: string; iv: string }> {
  if (!plaintext || !password || !salt) {
    throw new Error('Missing required encryption parameters');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate random IV
  const iv = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(iv);

  // Derive encryption key
  const key = await deriveKey(password, salt);

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv
    },
    key,
    data
  );

  return {
    encrypted: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer)
  };
}

/**
 * Decrypt encrypted data
 */
export async function decryptData(
  encrypted: string,
  iv: string,
  password: string,
  salt: string
): Promise<string> {
  if (!encrypted || !iv || !password || !salt) {
    throw new Error('Missing required decryption parameters');
  }

  const encryptedBuffer = base64ToArrayBuffer(encrypted);
  const ivBuffer = base64ToArrayBuffer(iv);

  // Derive decryption key
  const key = await deriveKey(password, salt);

  try {
    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: ivBuffer.buffer as ArrayBuffer
      },
      key,
      encryptedBuffer.buffer as ArrayBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error('Decryption failed - incorrect password or corrupted data');
  }
}

/**
 * Get or create encryption salt for current user
 */
export async function getUserEncryptionSalt(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('encryption_key_salt, encryption_enabled')
    .eq('user_id', user.id)
    .single();

  if (preferences?.encryption_key_salt) {
    return preferences.encryption_key_salt;
  }

  return null;
}

/**
 * Initialize encryption for user (create salt)
 */
export async function initializeUserEncryption(password: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Generate new salt
  const salt = generateSalt();

  // Test that password works by encrypting a test string
  try {
    await encryptData('test', password, salt);
  } catch (error) {
    throw new Error('Failed to initialize encryption - invalid password');
  }

  // Save salt to user preferences
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      encryption_enabled: true,
      encryption_key_salt: salt
    }, {
      onConflict: 'user_id'
    });

  if (error) throw error;

  return salt;
}

/**
 * Disable encryption for user
 */
export async function disableUserEncryption(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_preferences')
    .update({
      encryption_enabled: false,
      encryption_key_salt: null
    })
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Check if user has encryption enabled
 */
export async function isEncryptionEnabled(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('encryption_enabled')
    .eq('user_id', user.id)
    .single();

  return preferences?.encryption_enabled || false;
}

/**
 * Verify encryption password is correct
 */
export async function verifyEncryptionPassword(password: string): Promise<boolean> {
  const salt = await getUserEncryptionSalt();
  if (!salt) return false;

  try {
    // Try to encrypt and decrypt a test string
    const { encrypted, iv } = await encryptData('test', password, salt);
    const decrypted = await decryptData(encrypted, iv, password, salt);
    return decrypted === 'test';
  } catch {
    return false;
  }
}

// Helper functions for base64 encoding/decoding
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
