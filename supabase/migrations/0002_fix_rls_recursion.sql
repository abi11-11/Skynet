-- Fix infinite recursion between farm_plots and farm_plot_assignments

-- Drop the old circular policies
drop policy if exists select_farm_plot_assignments on public.farm_plot_assignments;
drop policy if exists insert_farm_plot_assignments on public.farm_plot_assignments;
drop policy if exists update_farm_plot_assignments_owner on public.farm_plot_assignments;
drop policy if exists delete_farm_plot_assignments_owner on public.farm_plot_assignments;

-- Create a security definer function to check plot ownership safely
create or replace function public.is_plot_owner_or_manager(p_plot_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.farm_plots
    where id = p_plot_id and (owner_id = auth.uid() or manager_id = auth.uid())
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Recreate policies using the safe function
create policy select_farm_plot_assignments on public.farm_plot_assignments
  for select
  using (
    auth.uid() = user_id
    or public.is_plot_owner_or_manager(plot_id)
  );

create policy insert_farm_plot_assignments on public.farm_plot_assignments
  for insert
  with check (
    public.is_plot_owner_or_manager(plot_id)
  );

create policy update_farm_plot_assignments_owner on public.farm_plot_assignments
  for update
  using (public.is_plot_owner_or_manager(plot_id))
  with check (public.is_plot_owner_or_manager(plot_id));

create policy delete_farm_plot_assignments_owner on public.farm_plot_assignments
  for delete
  using (public.is_plot_owner_or_manager(plot_id));
