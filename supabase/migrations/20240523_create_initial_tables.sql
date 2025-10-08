-- Create the stores table
CREATE TABLE public.stores (
  id uuid NOT NULL PRIMARY KEY,
  name text NOT NULL,
  location text,
  pradanaTokenBalance integer DEFAULT 0,
  adminUids uuid[],
  createdAt timestamptz DEFAULT now(),
  transactionCounter integer DEFAULT 0,
  firstTransactionDate timestamptz
);

-- Create the users table (or user_profiles)
CREATE TABLE public.users (
  id uuid NOT NULL PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  whatsapp text,
  role text,
  status text,
  storeId uuid REFERENCES public.stores(id),
  CONSTRAINT fk_user FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS) for the tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow public read-only access to stores
CREATE POLICY "Allow public read access to stores" ON public.stores
  FOR SELECT USING (true);

-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Allow admins to do anything on their own store
CREATE POLICY "Admins can manage their own store" ON public.stores
  FOR ALL USING (auth.uid() = ANY (adminUids))
  WITH CHECK (auth.uid() = ANY (adminUids));

-- Allow admins to manage user profiles within their store
CREATE POLICY "Admins can manage user profiles in their store" ON public.users
  FOR ALL USING (storeId IN (
    SELECT id FROM public.stores WHERE auth.uid() = ANY (adminUids)
  ))
  WITH CHECK (storeId IN (
    SELECT id FROM public.stores WHERE auth.uid() = ANY (adminUids)
  ));
