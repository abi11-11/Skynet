import { supabase } from "./supabase";
import type { Tenant, TenantUser } from "@skynet/types";

export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .order("level", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching tenants:", error);
    throw error;
  }
  return data as Tenant[];
}

export async function getTenantUsers(): Promise<TenantUser[]> {
  const { data, error } = await supabase.from("tenant_users").select("*");

  if (error) {
    console.error("Error fetching tenant users:", error);
    throw error;
  }
  return data as TenantUser[];
}

export async function createChildTenant(
  parentTenantId: string,
  managerId: string,
  tenantName: string
): Promise<string> {
  const { data, error } = await supabase.rpc("create_child_tenant", {
    p_parent_tenant_id: parentTenantId,
    p_new_manager_id: managerId,
    p_tenant_name: tenantName,
  });

  if (error) {
    console.error("Error creating child tenant:", error);
    throw error;
  }
  return data;
}

export async function assignPlotToTenant(
  plotId: string,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from("farm_plots")
    .update({ tenant_id: tenantId })
    .eq("id", plotId);

  if (error) {
    console.error("Error assigning plot to tenant:", error);
    throw error;
  }
}

export async function assignUserToTenant(
  userId: string,
  tenantId: string,
  role: 'owner' | 'manager' | 'sub-manager' = 'manager'
): Promise<void> {
  const { error } = await supabase
    .from("tenant_users")
    .upsert({ tenant_id: tenantId, user_id: userId, role });

  if (error) {
    console.error("Error assigning user to tenant:", error);
    throw error;
  }
}

export async function removeUserFromTenant(
  userId: string,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from("tenant_users")
    .delete()
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error removing user from tenant:", error);
    throw error;
  }
}
