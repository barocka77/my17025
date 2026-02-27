import { supabase } from '../lib/supabase';

export interface RecordSignature {
  id: string;
  module_key: string;
  record_id: string;
  signer_role: string;
  signer_name: string;
  signer_id: string;
  signature_type: string;
  signature_image_url: string | null;
  signed_at: string;
  created_at: string;
}

export const SIGNATURE_ROLES = [
  { value: 'hazirlayan', label: 'Hazirlayan' },
  { value: 'kontrol_eden', label: 'Kontrol Eden' },
  { value: 'onaylayan', label: 'Onaylayan' },
] as const;

export type SignatureRoleValue = typeof SIGNATURE_ROLES[number]['value'];

export const FINAL_APPROVAL_ROLE: SignatureRoleValue = 'onaylayan';

export function getRoleLabel(value: string): string {
  return SIGNATURE_ROLES.find(r => r.value === value)?.label || value;
}

export async function fetchSignatures(moduleKey: string, recordId: string): Promise<RecordSignature[]> {
  const { data, error } = await supabase
    .from('record_signatures')
    .select('*')
    .eq('module_key', moduleKey)
    .eq('record_id', recordId)
    .order('signed_at', { ascending: true });

  if (error) throw error;
  return (data || []) as RecordSignature[];
}

export async function saveSignature(params: {
  moduleKey: string;
  recordId: string;
  signerRole: SignatureRoleValue;
  signerName: string;
  signerId: string;
  signatureDataUrl: string;
}): Promise<RecordSignature> {
  const { moduleKey, recordId, signerRole, signerName, signerId, signatureDataUrl } = params;

  const base64 = signatureDataUrl.split(',')[1];
  const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const fileName = `${moduleKey}/${recordId}/${signerId}_${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from('signatures')
    .upload(fileName, byteArray, { contentType: 'image/png', upsert: false });

  if (uploadError) throw uploadError;

  const { data: urlData } = await supabase.storage
    .from('signatures')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365);

  const imageUrl = urlData?.signedUrl || fileName;

  const { data, error } = await supabase
    .from('record_signatures')
    .insert({
      module_key: moduleKey,
      record_id: recordId,
      signer_role: signerRole,
      signer_name: signerName,
      signer_id: signerId,
      signature_type: 'drawn',
      signature_image_url: imageUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data as RecordSignature;
}

export async function deleteSignature(signatureId: string, imageUrl: string | null): Promise<void> {
  if (imageUrl && !imageUrl.startsWith('http')) {
    await supabase.storage.from('signatures').remove([imageUrl]);
  }

  const { error } = await supabase
    .from('record_signatures')
    .delete()
    .eq('id', signatureId);

  if (error) throw error;
}

export function isRecordLocked(signatures: RecordSignature[]): boolean {
  return signatures.some(s => s.signer_role === FINAL_APPROVAL_ROLE);
}

export async function getSignatureImageUrl(storagePath: string): Promise<string | null> {
  if (storagePath.startsWith('http')) return storagePath;

  const { data, error } = await supabase.storage
    .from('signatures')
    .createSignedUrl(storagePath, 3600);

  if (error) return null;
  return data.signedUrl;
}
