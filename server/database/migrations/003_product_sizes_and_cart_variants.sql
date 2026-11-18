BEGIN;

CREATE TABLE IF NOT EXISTS public.product_sizes (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size VARCHAR(16) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (product_id, size)
);

INSERT INTO public.product_sizes (product_id, size, quantity)
SELECT p.id, 'ONE_SIZE', GREATEST(COALESCE(i.quantity, p.stock_quantity, 0), 0)
  FROM public.products p
  LEFT JOIN public.inventory i ON i.product_id = p.id
ON CONFLICT (product_id, size) DO NOTHING;

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS size VARCHAR(16) NOT NULL DEFAULT 'ONE_SIZE';

ALTER TABLE public.cart_items
  DROP CONSTRAINT IF EXISTS cart_items_pkey;

ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_pkey PRIMARY KEY (cart_id, product_id, size);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS size VARCHAR(16) NOT NULL DEFAULT 'ONE_SIZE';

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS size VARCHAR(16) NOT NULL DEFAULT 'ONE_SIZE';

CREATE INDEX IF NOT EXISTS idx_product_sizes_product_id
  ON public.product_sizes(product_id);

COMMIT;
