create table public.users (
  id uuid not null,
  email text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  is_deleted boolean null default false,
  deleted_at timestamp with time zone null,
  reactivated_at timestamp with time zone null,
  constraint users_pkey primary key (id),
  constraint users_id_fkey foreign KEY (id) references auth.users (id)
) TABLESPACE pg_default;

create table public.user_preferences (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  has_completed_onboarding boolean null default false,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint user_preferences_pkey primary key (id),
  constraint user_preferences_user_id_key unique (user_id),
  constraint user_preferences_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.user_trials (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  trial_start_time timestamp with time zone null default now(),
  trial_end_time timestamp with time zone not null,
  is_trial_used boolean null default false,
  constraint user_trials_pkey primary key (id),
  constraint user_trials_user_id_key unique (user_id),
  constraint user_trials_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create table public.subscriptions (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  status text null,
  price_id text null,
  created_at timestamp with time zone null default now(),
  cancel_at_period_end boolean null default false,
  updated_at timestamp with time zone null default now(),
  current_period_end timestamp with time zone null,
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role full access to users" ON public.users
  FOR ALL TO service_role USING (true);

-- User preferences policies
CREATE POLICY "Users can read their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to preferences" ON public.user_preferences
  FOR ALL TO service_role USING (true);

-- User trials policies
CREATE POLICY "Users can read their own trials" ON public.user_trials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trials" ON public.user_trials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trials" ON public.user_trials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to trials" ON public.user_trials
  FOR ALL TO service_role USING (true);

-- Subscriptions policies
CREATE POLICY "Users can read their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to subscriptions" ON public.subscriptions
  FOR ALL TO service_role USING (true);

-- Outfits table for storing analyzed outfits
create table public.outfits (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  outfit_images text[] not null,
  selected_items text[] null,
  outfit_score integer null,
  pros text null,
  cons text null,
  suggestion text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
  constraint outfits_pkey primary key (id),
  constraint outfits_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint outfit_images_length_check check (
    array_length(outfit_images, 1) >= 1 AND array_length(outfit_images, 1) <= 3
  ),
  constraint outfit_score_range_check check (
    outfit_score is null or (outfit_score >= 1 and outfit_score <= 5)
  )
) TABLESPACE pg_default;

-- Enable RLS on outfits
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

-- Outfits policies
CREATE POLICY "Users can read their own outfits" ON public.outfits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits" ON public.outfits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfits" ON public.outfits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfits" ON public.outfits
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to outfits" ON public.outfits
  FOR ALL TO service_role USING (true);

-- Create storage bucket for outfit images (public read) - compatible approach
insert into storage.buckets (id, name, public)
values ('outfits', 'outfits', true)
on conflict (id) do nothing;

-- Storage policies for outfits bucket
create policy "Public read access for outfits bucket" on storage.objects
  for select using (bucket_id = 'outfits');

create policy "Authenticated users can upload to outfits bucket in their folder" on storage.objects
  for insert with check (
    bucket_id = 'outfits' and
    (auth.role() = 'authenticated') and
    (position(auth.uid()::text || '/' in name) = 1)
  );

create policy "Users can update their own objects in outfits bucket" on storage.objects
  for update using (
    bucket_id = 'outfits' and
    (position(auth.uid()::text || '/' in name) = 1)
  );

create policy "Users can delete their own objects in outfits bucket" on storage.objects
  for delete using (
    bucket_id = 'outfits' and
    (position(auth.uid()::text || '/' in name) = 1)
  );