/*
  # Yönetim Sistemi Aksiyonları Tablosunu Kaldır

  1. Değişiklikler
    - `management_system_actions` tablosu kaldırılıyor
    - İlgili indexler otomatik olarak kaldırılacak
    - İlgili RLS politikaları otomatik olarak kaldırılacak

  2. Güvenlik
    - Bu işlem veri kaybına neden olur
    - Tabloyu kullanan tüm kayıtlar silinecek
*/

DROP TABLE IF EXISTS management_system_actions CASCADE;
