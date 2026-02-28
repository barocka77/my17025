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

export interface RecordLockState {
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
  unlock_reason: string | null;
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

export async function fetchRecordLockState(recordId: string): Promise<RecordLockState> {
  const { data, error } = await supabase
    .from('feedback_records')
    .select('is_locked, locked_at, locked_by, unlocked_at, unlocked_by, unlock_reason')
    .eq('id', recordId)
    .maybeSingle();

  if (error) throw error;
  return {
    is_locked: data?.is_locked ?? false,
    locked_at: data?.locked_at ?? null,
    locked_by: data?.locked_by ?? null,
    unlocked_at: data?.unlocked_at ?? null,
    unlocked_by: data?.unlocked_by ?? null,
    unlock_reason: data?.unlock_reason ?? null,
  };
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

export async function verifyAndSign(params: {
  password: string;
  moduleKey: string;
  recordId: string;
  roleId: string;
  roleName: string;
}): Promise<RecordSignature> {
  const { password, moduleKey, recordId, roleId, roleName } = params;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadi');

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-and-sign`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password,
      module_key: moduleKey,
      record_id: recordId,
      role_id: roleId,
      role_name: roleName,
      ip_address: null,
      user_agent: navigator.userAgent,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Imza islemi basarisiz');
  }

  return result.signature as RecordSignature;
}

export async function closeFeedbackRecord(params: {
  password: string;
  recordId: string;
}): Promise<RecordSignature> {
  const { password, recordId } = params;

  const roles = await fetchModuleRoles('feedback_records');
  const closerRole = roles.find(r => r.is_final_approval);
  if (!closerRole) throw new Error('Kapatma rolu bulunamadi');

  return verifyAndSign({
    password,
    moduleKey: 'feedback_records',
    recordId,
    roleId: closerRole.id,
    roleName: closerRole.role_name,
  });
}

export async function adminUnlockRecord(recordId: string, reason: string): Promise<void> {
  const { data, error } = await supabase.rpc('unlock_feedback_record', {
    p_record_id: recordId,
    p_reason: reason,
  });

  if (error) throw error;

  const result = data as { success: boolean; message: string } | null;
  if (result && !result.success) {
    throw new Error(result.message);
  }
}
