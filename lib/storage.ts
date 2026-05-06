import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

/**
 * Upload a receipt image (local file URI) to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadReceipt(
  localUri: string,
  workspaceId: string,
  userId: string,
  expenseId: string
): Promise<string> {
  // Read the file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  });

  const storagePath = `${workspaceId}/${userId}/${expenseId}.jpg`;
  const fileData = decode(base64);

  const { error } = await supabase.storage
    .from('receipts')
    .upload(storagePath, fileData, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('receipts').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Upload a receipt from base64 string directly (used during OCR flow
 * before we have a confirmed expense ID — uses a temp UUID).
 */
export async function uploadReceiptBase64(
  base64: string,
  workspaceId: string,
  userId: string,
  tempId: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const storagePath = `${workspaceId}/${userId}/${tempId}.jpg`;
  const fileData = decode(base64);

  const { error } = await supabase.storage
    .from('receipts')
    .upload(storagePath, fileData, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('receipts').getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

/**
 * Upload a receipt from a base64 string with explicit mime type.
 * Handles both images (jpeg/png) and PDFs.
 */
export async function uploadReceiptFile(
  base64: string,
  mimeType: string,
  workspaceId: string,
  userId: string,
  tempId: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const ext = mimeType === 'application/pdf' ? 'pdf'
    : mimeType === 'image/png' ? 'png'
    : 'jpg';
  const storagePath = `${workspaceId}/${userId}/${tempId}.${ext}`;
  const fileData = decode(base64);

  const { error } = await supabase.storage
    .from('receipts')
    .upload(storagePath, fileData, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('receipts').getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

/**
 * Delete a receipt from storage (called when deleting a draft expense).
 */
export async function deleteReceipt(storagePath: string): Promise<void> {
  await supabase.storage.from('receipts').remove([storagePath]);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Decode a base64 string to a Uint8Array for Supabase upload */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
