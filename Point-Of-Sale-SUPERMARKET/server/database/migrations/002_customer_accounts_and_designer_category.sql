BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_accounts_email_lower_unique
  ON public.customer_accounts (LOWER(email));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_allowed_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_category_allowed_check
  CHECK (category IN ('SHIRT', 'HOODIE', 'DESIGNER')) NOT VALID;

COMMIT;
