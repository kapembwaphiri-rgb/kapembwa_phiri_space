BEGIN;

CREATE TABLE IF NOT EXISTS public.product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_product_url
  ON public.product_images(product_id, image_url);
CREATE INDEX IF NOT EXISTS idx_product_images_order
  ON public.product_images(product_id, sort_order, id);

INSERT INTO public.product_images (product_id, image_url, sort_order)
SELECT p.id, p.image_url, 0
  FROM public.products p
 WHERE p.image_url IS NOT NULL AND p.image_url <> ''
ON CONFLICT (product_id, image_url) DO NOTHING;

COMMIT;
