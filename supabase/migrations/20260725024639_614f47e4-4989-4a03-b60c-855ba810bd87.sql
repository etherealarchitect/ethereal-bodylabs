INSERT INTO public.subscriptions (user_id, stripe_subscription_id, stripe_customer_id, product_id, price_id, status, current_period_start, current_period_end, cancel_at_period_end, environment)
SELECT 'b5997f80-afcc-49b1-9128-7c0995b989c2'::uuid, 'admin_comp_'||env, 'admin_comp_customer', 'premium', 'premium_yearly', 'active', now(), now() + interval '100 years', false, env
FROM (VALUES ('live'),('sandbox')) AS t(env)
ON CONFLICT (stripe_subscription_id) DO UPDATE
SET status='active', current_period_end = now() + interval '100 years', cancel_at_period_end=false, updated_at=now();