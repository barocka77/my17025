import { supabase } from '../lib/supabase';

export interface DocumentMeta {
  id: string;
  dokuman_kodu: string;
  dokuman_adi: string;
  rev_no: string;
  revizyon_tarihi: string | null;
}

export async function getLinkedDocument(moduleKey: string): Promise<DocumentMeta | null> {
  const { data: link } = await supabase
    .from('module_document_links')
    .select('document_id')
    .eq('module_key', moduleKey)
    .maybeSingle();

  if (!link?.document_id) return null;

  const { data: doc } = await supabase
    .from('document_master_list')
    .select('id, dokuman_kodu, dokuman_adi, rev_no, revizyon_tarihi')
    .eq('id', link.document_id)
    .maybeSingle();

  return doc || null;
}

export async function saveDocumentLink(moduleKey: string, documentId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('module_document_links')
    .select('id')
    .eq('module_key', moduleKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('module_document_links')
      .update({ document_id: documentId })
      .eq('module_key', moduleKey);
    return !error;
  }

  const { error } = await supabase
    .from('module_document_links')
    .insert({ module_key: moduleKey, document_id: documentId });
  return !error;
}

export async function fetchActiveDocuments(): Promise<DocumentMeta[]> {
  const { data } = await supabase
    .from('document_master_list')
    .select('id, dokuman_kodu, dokuman_adi, rev_no, revizyon_tarihi')
    .eq('aktif', true)
    .order('dokuman_kodu', { ascending: true });

  return data || [];
}

export function formatRevDate(date: string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
