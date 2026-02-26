/*
  # Update handle_new_user Trigger – Set created_by

  ## Summary
  Updates the handle_new_user trigger function to populate the created_by column
  with the new user's email address when a profile row is first created.

  ## Changes
  - Adds created_by = new.email to the INSERT in handle_new_user
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    last_action_ack_at,
    created_by
  )
  VALUES (
    new.id,
    new.email,
    'personnel',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    '2000-01-01',
    new.email
  );
  RETURN new;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Profil oluşturulurken hata: %', SQLERRM;
  RETURN new;
END;
$$;
