BEGIN;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_photo TEXT;

ALTER TABLE IF EXISTS public.customer_accounts
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_photo TEXT;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS account_id UUID;

DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_orders_account_created
      ON public.orders(account_id, created_at DESC);
  END IF;
END
$$;

COMMIT;
