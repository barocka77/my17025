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

export interface ModuleSignatureRole {
  id: string;
  module_key: string;
  role_name: string;
  role_order: number;
  is_final_approval: boolean;
}

export async function fetchModuleRoles(moduleKey: string): Promise<ModuleSignatureRole[]> {
  const { data, error } = await supabase
    .from('module_signature_roles')
    .select('*')
    .eq('module_key', moduleKey)
    .order('role_order', { ascending: true });

  if (error) throw error;
  return (data || []) as ModuleSignatureRole[];
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
  signerRole: string;
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

export function isRecordLocked(signatures: RecordSignature[], roles: ModuleSignatureRole[]): boolean {
  const finalRoleNames = roles.filter(r => r.is_final_approval).map(r => r.role_name);
  if (finalRoleNames.length === 0) return false;
  return signatures.some(s => finalRoleNames.includes(s.signer_role));
}

export async function fetchFinalApprovalRoleNames(moduleKey: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('module_signature_roles')
    .select('role_name')
    .eq('module_key', moduleKey)
    .eq('is_final_approval', true);

  if (error) return [];
  return (data || []).map(r => r.role_name);
}
