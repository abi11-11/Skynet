import { supabase } from './supabase';
import { UserProfile, Role, Group, GroupRole, UserGroup, AuditLog } from '@skynet/types';

export const SecurityAPI = {
  // --- User Profiles ---
  async getUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createUser(user: Partial<UserProfile>, password?: string): Promise<UserProfile> {
    // Call our new RPC to create the user in auth.users securely
    const { data: newUserId, error: rpcError } = await supabase.rpc('create_user_by_admin', {
      p_email: user.email,
      p_full_name: user.full_name,
      p_phone_number: user.phone_number,
      p_user_type: user.user_type,
      p_is_active: user.is_active ?? true,
      p_expires_at: user.expires_at ?? null,
      p_password: password || 'password123',
    });
    
    if (rpcError) throw rpcError;

    // The trigger will have populated user_profiles, so fetch it to return
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', newUserId)
      .single();
      
    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: Partial<UserProfile>): Promise<void> {
    if ('is_active' in updates || 'expires_at' in updates) {
      // First get current profile to fill missing fields for RPC if only one is updated
      const { data: curr } = await supabase.from('user_profiles').select('is_active, expires_at').eq('id', id).single();
      
      const { error: rpcError } = await supabase.rpc('update_user_lifecycle', {
        p_user_id: id,
        p_is_active: updates.is_active ?? curr?.is_active ?? true,
        p_expires_at: updates.expires_at !== undefined ? updates.expires_at : (curr?.expires_at ?? null)
      });
      if (rpcError) throw rpcError;
      
      // Remove these from updates so we don't try to update them again in the next step
      const { is_active, expires_at, ...restUpdates } = updates;
      if (Object.keys(restUpdates).length > 0) {
        const { error } = await supabase.from('user_profiles').update(restUpdates).eq('id', id);
        if (error) throw error;
      }
    } else {
      const { error } = await supabase.from('user_profiles').update(updates).eq('id', id);
      if (error) throw error;
    }
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.from('user_profiles').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Roles ---
  async getRoles(tenantId?: string): Promise<Role[]> {
    let query = supabase.from('roles').select('*').order('name');
    if (tenantId) {
      query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createRole(role: Omit<Role, 'id' | 'created_at'>): Promise<Role> {
    const { data, error } = await supabase.from('roles').insert(role).select().single();
    if (error) throw error;
    return data;
  },

  async seedDefaultRoles(tenantId?: string): Promise<void> {
    const modules = [
      'DASHBOARD', 'FARM_PLOTS', 'FLEET', 'CROPS', 
      'IRRIGATION', 'WEATHER', 'HARVESTS', 'ANALYTICS', 
      'TRACEABILITY', 'SETTINGS', 'ORGANIZATION'
    ];

    try {
      // 1. Create Super Admin (Parent of all)
      const superAdmin = await this.createRole({
        name: 'SUPER_ADMIN',
        description: 'All access to CRUD',
        tenant_id: tenantId || null,
        parent_id: null
      });

      // 2. Create Module Parents and CRUD children
      for (const mod of modules) {
        const modParent = await this.createRole({
          name: `${mod}_ALL`,
          description: `All access to ${mod}`,
          tenant_id: tenantId || null,
          parent_id: superAdmin.id
        });

        const actions = ['ADD', 'EDIT', 'VIEW', 'DELETE'];
        for (const action of actions) {
          await this.createRole({
            name: `${action}_${mod}`,
            description: `${action} access for ${mod}`,
            tenant_id: tenantId || null,
            parent_id: modParent.id
          });
        }
      }
    } catch (err) {
      console.error("Failed to seed default roles", err);
      throw err;
    }
  },

  async updateRole(id: string, updates: Partial<Role>): Promise<void> {
    const { error } = await supabase.from('roles').update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteRole(id: string): Promise<void> {
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Groups ---
  async getGroups(tenantId: string): Promise<Group[]> {
    const { data, error } = await supabase.from('groups').select('*').eq('tenant_id', tenantId).order('name');
    if (error) throw error;
    return data || [];
  },

  async createGroup(group: Omit<Group, 'id' | 'created_at'>): Promise<Group> {
    const { data, error } = await supabase.from('groups').insert(group).select().single();
    if (error) throw error;
    return data;
  },

  async updateGroup(id: string, updates: Partial<Group>): Promise<void> {
    const { error } = await supabase.from('groups').update(updates).eq('id', id);
    if (error) throw error;
  },

  async deleteGroup(id: string): Promise<void> {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Group Roles (Mapping) ---
  async getGroupRoles(groupId: string): Promise<GroupRole[]> {
    const { data, error } = await supabase.from('group_roles').select('*').eq('group_id', groupId);
    if (error) throw error;
    return data || [];
  },

  async assignRoleToGroup(groupId: string, roleId: string): Promise<void> {
    const { error } = await supabase.from('group_roles').insert({ group_id: groupId, role_id: roleId });
    if (error) throw error;
  },

  async removeRoleFromGroup(groupId: string, roleId: string): Promise<void> {
    const { error } = await supabase.from('group_roles').delete().eq('group_id', groupId).eq('role_id', roleId);
    if (error) throw error;
  },

  // --- User Groups (Mapping) ---
  async getUserGroups(userId: string): Promise<UserGroup[]> {
    const { data, error } = await supabase.from('user_groups').select('*').eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  async assignUserToGroup(userId: string, groupId: string): Promise<void> {
    const { error } = await supabase.from('user_groups').insert({ user_id: userId, group_id: groupId });
    if (error) throw error;
  },

  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    const { error } = await supabase.from('user_groups').delete().eq('user_id', userId).eq('group_id', groupId);
    if (error) throw error;
  },

  // --- Audit Logs ---
  async getAuditLogs(tenantId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  },

  async deleteAuditLog(id: string): Promise<void> {
    const { error } = await supabase.from('audit_logs').delete().eq('id', id);
    if (error) throw error;
  }
};
