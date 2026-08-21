-- Allow anon read/write for local development MVP on tenancy tables
CREATE POLICY anon_all_tenants ON public.tenants FOR ALL USING (auth.role() = 'anon');
CREATE POLICY anon_all_tenant_users ON public.tenant_users FOR ALL USING (auth.role() = 'anon');
