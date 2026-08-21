import { useState, useEffect } from "react";
import { useAuth } from "../App";
import { getTenants, createChildTenant, assignUserToTenant, removeUserFromTenant } from "../lib/tenancy";
import { SecurityAPI } from "../lib/security";
import { supabase } from "../lib/supabase";
import type { Tenant, UserProfile, Role, Group, AuditLog } from "@skynet/types";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "organization" | "users" | "groups" | "audit" | "ai">("general");
  
  // State
  const [ragEnabled, setRagEnabled] = useState(() => {
    return localStorage.getItem("skynet_rag_automation") !== "false";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const defaultTenantId = tenants[0]?.id;

  // Org State
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");

  // Role/Group State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formGroupRoleIds, setFormGroupRoleIds] = useState<string[]>([]);

  // User State
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<{ id: string; email: string; full_name: string; phone_number: string; user_type: string; organization_id: string; group_ids: string[]; password?: string; is_active: boolean; expires_at: string }>({ id: "", email: "", full_name: "", phone_number: "", user_type: "", organization_id: "", group_ids: [], password: "", is_active: true, expires_at: "" });
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Group Management State
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupRoleIds, setGroupRoleIds] = useState<string[]>([]);
  const [groupUserIds, setGroupUserIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const _tenants = await getTenants();
      setTenants(_tenants);
      const tid = _tenants[0]?.id;

      if (activeTab === "organization") {
        if (_tenants.length > 0 && !selectedParentId) {
          setSelectedParentId(_tenants[0].id);
        }
      } else if (activeTab === "users") {
        setProfiles(await SecurityAPI.getUsers());
        if (tid) setGroups(await SecurityAPI.getGroups(tid));
      } else if (activeTab === "groups") {
        setRoles(await SecurityAPI.getRoles(tid));
        setProfiles(await SecurityAPI.getUsers());
        if (tid) setGroups(await SecurityAPI.getGroups(tid));
      } else if (activeTab === "audit") {
        if (tid) setLogs(await SecurityAPI.getAuditLogs(tid));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // --- Tenants ---
  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantName || !selectedParentId || !user) return;
    try {
      await createChildTenant(selectedParentId, user.id, tenantName);
      setShowTenantModal(false);
      setTenantName("");
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // --- Users ---
  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      let savedUserId = userForm.id;
      const profileData = { 
        email: userForm.email, 
        full_name: userForm.full_name,
        phone_number: userForm.phone_number,
        user_type: (userForm.user_type as any) || null,
        is_active: userForm.is_active,
        expires_at: userForm.expires_at || null
      };

      if (isEditingUser) {
        await SecurityAPI.updateUser(userForm.id, profileData);
      } else {
        if (!userForm.password || userForm.password.length < 12) {
          throw new Error("Password must be at least 12 characters long.");
        }
        const newUser = await SecurityAPI.createUser(profileData, userForm.password);
        savedUserId = newUser.id;
      }

      // Handle Tenant Assignment
      if (userForm.organization_id) {
        await assignUserToTenant(savedUserId, userForm.organization_id, (userForm.user_type as any) || 'manager');
      }

      // Handle Group Assignment
      // 1. Get current groups
      const currentGroups = await SecurityAPI.getUserGroups(savedUserId);
      const currentGroupIds = currentGroups.map(g => g.group_id);

      // 2. Add new
      for (const gid of userForm.group_ids) {
        if (!currentGroupIds.includes(gid)) {
          await SecurityAPI.assignUserToGroup(savedUserId, gid);
        }
      }

      // 3. Remove deleted
      for (const cid of currentGroupIds) {
        if (!userForm.group_ids.includes(cid)) {
          await SecurityAPI.removeUserFromGroup(savedUserId, cid);
        }
      }

      setShowUserModal(false);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await SecurityAPI.deleteUser(id);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function openEditUserModal(p: UserProfile) {
    try {
      // Fetch user's tenant
      const { data: tuData } = await supabase.from('tenant_users').select('tenant_id').eq('user_id', p.id).limit(1);
      const orgId = tuData && tuData.length > 0 ? tuData[0].tenant_id : "";

      // Fetch user's groups
      const ugData = await SecurityAPI.getUserGroups(p.id);
      const gIds = ugData.map(ug => ug.group_id);

      setUserForm({ 
        id: p.id, 
        email: p.email, 
        full_name: p.full_name || "", 
        phone_number: p.phone_number || "", 
        user_type: p.user_type || "", 
        organization_id: orgId, 
        group_ids: gIds,
        password: "", // Don't fetch password
        is_active: p.is_active ?? true,
        expires_at: p.expires_at ? new Date(p.expires_at).toISOString().slice(0, 16) : ""
      });
      setIsEditingUser(true);
      setShowUserModal(true);
    } catch (err: any) {
      alert("Error fetching user details: " + err.message);
    }
  }

  // --- Roles ---
  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    try {
      await SecurityAPI.createRole({ name: formName, description: formDesc, tenant_id: defaultTenantId || null, parent_id: null });
      setShowRoleModal(false);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleDeleteRole(id: string) {
    if (!confirm("Are you sure?")) return;
    try {
      await SecurityAPI.deleteRole(id);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleSeedRoles() {
    try {
      setLoading(true);
      await SecurityAPI.seedDefaultRoles(defaultTenantId);
      await fetchData();
      alert("Default roles seeded successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const renderRoleTree = (parentId: string | null, depth = 0) => {
    const children = roles.filter(r => r.parent_id === parentId);
    if (children.length === 0) return null;

    return (
      <ul style={{ listStyle: "none", paddingLeft: depth === 0 ? 0 : 20, margin: 0 }}>
        {children.map(r => (
          <li key={r.id} style={{ marginBottom: depth === 0 ? 12 : 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: depth === 0 ? "var(--bg-subtle)" : "transparent", padding: depth === 0 ? "10px 14px" : "4px 0", borderRadius: 8, border: depth === 0 ? "1px solid var(--border)" : "none" }}>
              <div>
                <span style={{ fontWeight: depth === 0 ? 600 : 500, color: depth === 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>{r.name}</span>
                {depth === 0 && r.tenant_id && <span className="badge badge-blue" style={{ marginLeft: 8 }}>Local</span>}
                {depth === 0 && !r.tenant_id && <span className="badge badge-gray" style={{ marginLeft: 8 }}>Global</span>}
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{r.description}</div>
              </div>
              <button className="action-btn delete" onClick={() => handleDeleteRole(r.id)}>🗑️</button>
            </div>
            {renderRoleTree(r.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  // --- Groups ---
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!defaultTenantId) return alert("No tenant found");
    try {
      const newGroup = await SecurityAPI.createGroup({ name: formName, description: formDesc, tenant_id: defaultTenantId });
      for (const roleId of formGroupRoleIds) {
        await SecurityAPI.assignRoleToGroup(newGroup.id, roleId);
      }
      setShowGroupModal(false);
      setFormGroupRoleIds([]);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm("Are you sure?")) return;
    try {
      await SecurityAPI.deleteGroup(id);
      if (selectedGroup?.id === id) setSelectedGroup(null);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function selectGroupForManagement(g: Group) {
    setSelectedGroup(g);
    try {
      const gr = await SecurityAPI.getGroupRoles(g.id);
      setGroupRoleIds(gr.map(r => r.role_id));
      const { data } = await supabase.from('user_groups').select('user_id').eq('group_id', g.id);
      setGroupUserIds(data?.map((r: any) => r.user_id) || []);
    } catch (err: any) {
      console.error(err);
    }
  }

  async function toggleGroupRole(roleId: string, assign: boolean) {
    if (!selectedGroup) return;
    try {
      if (assign) {
        await SecurityAPI.assignRoleToGroup(selectedGroup.id, roleId);
        setGroupRoleIds(prev => [...prev, roleId]);
      } else {
        await SecurityAPI.removeRoleFromGroup(selectedGroup.id, roleId);
        setGroupRoleIds(prev => prev.filter(id => id !== roleId));
      }
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function toggleGroupUser(userId: string, assign: boolean) {
    if (!selectedGroup) return;
    try {
      if (assign) {
        await SecurityAPI.assignUserToGroup(userId, selectedGroup.id);
        setGroupUserIds(prev => [...prev, userId]);
      } else {
        await SecurityAPI.removeUserFromGroup(userId, selectedGroup.id);
        setGroupUserIds(prev => prev.filter(id => id !== userId));
      }
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function handleDeleteAuditLog(id: string) {
    if (!confirm("Are you sure you want to delete this audit log?")) return;
    try {
      await SecurityAPI.deleteAuditLog(id);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>Settings</h2>
        <p>Account settings and platform configuration.</p>
      </div>

      <div className="page-body">
        <div className="settings-tabs" style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '24px', paddingBottom: '8px', overflowX: 'auto' }}>
          {(["general", "ai", "organization", "users", "groups", "audit"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedGroup(null); }}
              className={`settings-tab ${activeTab === tab ? "active" : ""}`}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '10px 16px',
                fontSize: '0.95rem',
                fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '-10px'
              }}
            >
              {tab === "general" ? "General" : 
               tab === "ai" ? "AI & Analytics" :
               tab === "organization" ? "Organization" :
               tab === "groups" ? "Groups & Roles" : 
               tab === "audit" ? "Audit Trail" : "Users"}
            </button>
          ))}
        </div>

        {loading && <div className="loading-spinner">Loading...</div>}
        {error && <div style={{ color: "var(--red)", marginBottom: 16 }}>{error}</div>}

        {!loading && !error && activeTab === "general" && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Profile</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={user?.email ?? ""} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">User ID</label>
                  <input className="form-input" value={user?.id ?? ""} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Active Persona</label>
                  <input className="form-input" value={user?.email?.split('@')[0] || "Unknown"} readOnly />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Platform</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Version</label>
                  <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>Skynet v0.1.0</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Backend</label>
                  <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>Supabase (PostgreSQL)</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>Tamil Nadu, India</div>
                </div>

                <div className="quote-box mt-20">
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>
                    Support
                  </div>
                  <div className="text-sm text-muted">
                    📞 +91 800-000-0000<br />
                    📧 support@skynet.farm<br />
                    Mon–Sat, 6 AM – 8 PM IST
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "ai" && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">AI Agronomist Automation</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>RAG Data Pipeline</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Automatically load weather & vegetative indices into context upon login.</div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={ragEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRagEnabled(checked);
                        localStorage.setItem("skynet_rag_automation", String(checked));
                      }}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }}/>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Generative Model</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Model used for crop health predictions.</div>
                  </div>
                  <select className="form-input" style={{ width: 150 }} disabled>
                    <option>GPT-4o</option>
                    <option>Claude 3.5 Sonnet</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Data Sources</h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }}></div>
                  <div style={{ flex: 1, fontSize: '0.9rem' }}>Sentinel-2 (NDVI, NDRE, EVI)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Connected</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }}></div>
                  <div style={{ flex: 1, fontSize: '0.9rem' }}>OpenWeatherMap API</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Connected</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }}></div>
                  <div style={{ flex: 1, fontSize: '0.9rem' }}>Soil Moisture Sensors</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Not configured</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "organization" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: "1.1rem" }}>Tenancy Hierarchy</h3>
                <p className="text-muted text-sm">Manage your organizational branches.</p>
              </div>
              <button className="btn-primary btn" onClick={() => setShowTenantModal(true)}>
                + Create Child Tenant
              </button>
            </div>
            <div className="grid-2">
              {tenants.map((t) => (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${t.level === 1 ? "var(--primary)" : t.level === 2 ? "var(--accent)" : "#10b981"}`,
                    marginLeft: `${(t.level - 1) * 20}px`
                  }}
                >
                  <div className="card-header">
                    <h3 className="card-title">{t.name}</h3>
                    <span className="badge badge-blue">Level {t.level}</span>
                  </div>
                  <div className="card-body">
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      <div className="mb-4"><strong>ID:</strong> <code style={{ background: "var(--bg-subtle)", padding: "2px 4px", borderRadius: 4 }}>{t.id.substring(0,8)}...</code></div>
                      {t.parent_id && (
                        <div><strong>Parent:</strong> {t.parent_id.substring(0,8)}...</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {tenants.length === 0 && <div className="text-muted">No organizations found.</div>}
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "users" && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 className="card-title">User Profiles</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { 
                setUserForm({ id: "", email: "", full_name: "", phone_number: "", user_type: "", organization_id: "", group_ids: [] });
                setIsEditingUser(false);
                setShowUserModal(true); 
              }}>+ New User</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Email Address</th>
                    <th>Full Name</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Joined Date</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>{p.id.substring(0,8)}...</td>
                      <td style={{ fontWeight: 500 }}>{p.email}</td>
                      <td>{p.full_name || <span className="text-muted">Not provided</span>}</td>
                      <td>{p.phone_number || <span className="text-muted">-</span>}</td>
                      <td>{p.user_type ? <span className="badge badge-gray">{p.user_type}</span> : <span className="text-muted">-</span>}</td>
                      <td>
                        {p.is_active ? <span className="badge badge-blue" style={{background: 'var(--green)', color: '#fff'}}>Active</span> : <span className="badge badge-gray" style={{background: 'var(--red)', color: '#fff'}}>Suspended</span>}
                        {p.expires_at && <div style={{fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)'}}>Expires: {new Date(p.expires_at).toLocaleDateString()}</div>}
                      </td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="action-btn" onClick={() => openEditUserModal(p)}>✏️</button>
                        <button className="action-btn delete" onClick={() => handleDeleteUser(p.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "groups" && (
          <div className="grid-2">
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title">Groups</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => { setFormName(""); setFormDesc(""); setFormGroupRoleIds([]); setShowGroupModal(true); }}>+ New Group</button>
                </div>
                <ul className="list-group">
                  {groups.map(g => (
                    <li key={g.id} className="list-item" style={{ cursor: "pointer", background: selectedGroup?.id === g.id ? "var(--bg-selected)" : "transparent" }} onClick={() => selectGroupForManagement(g)}>
                      <div className="list-item-content">
                        <div className="list-item-title">{g.name}</div>
                        <div className="list-item-desc">{g.description || "No description provided"}</div>
                      </div>
                      <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }} aria-label="Delete group">
                        🗑️
                      </button>
                    </li>
                  ))}
                  {groups.length === 0 && <li className="list-item"><span className="text-muted">No groups configured.</span></li>}
                </ul>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title">Roles Hierarchy</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleSeedRoles}>Seed Default Roles</button>
                    <button className="btn btn-primary btn-sm" onClick={() => { setFormName(""); setFormDesc(""); setShowRoleModal(true); }}>+ New Role</button>
                  </div>
                </div>
                <div style={{ padding: "16px 20px", maxHeight: "600px", overflowY: "auto" }}>
                  {roles.length > 0 ? renderRoleTree(null) : (
                    <div className="text-muted text-center" style={{ padding: "20px 0" }}>No roles configured. Click "Seed Default Roles" to generate them.</div>
                  )}
                </div>
              </div>
            </div>

            {selectedGroup ? (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Manage Group: {selectedGroup.name}</h3>
                </div>
                <div className="card-body">
                  <div className="section-label">Assigned Roles</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24, maxHeight: "300px", overflowY: "auto", padding: "4px" }}>
                    {roles.map(r => {
                      const isAssigned = groupRoleIds.includes(r.id);
                      return (
                        <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-subtle)", padding: "6px 12px", borderRadius: 16, cursor: "pointer", border: isAssigned ? "1px solid var(--accent)" : "1px solid var(--border)" }}>
                          <input type="checkbox" checked={isAssigned} onChange={(e) => toggleGroupRole(r.id, e.target.checked)} />
                          <span style={{ fontSize: "0.8rem", fontWeight: 500, color: isAssigned ? "var(--accent)" : "inherit" }}>{r.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="section-label">Assigned Users</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {profiles.map(p => {
                      const isAssigned = groupUserIds.includes(p.id);
                      return (
                        <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-subtle)", padding: "8px 12px", borderRadius: 8, cursor: "pointer", border: isAssigned ? "1px solid var(--accent)" : "1px solid transparent" }}>
                          <input type="checkbox" checked={isAssigned} onChange={(e) => toggleGroupUser(p.id, e.target.checked)} />
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{p.full_name || p.email}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{p.email}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state card">
                <div className="empty-icon">👥</div>
                <h3>Select a Group</h3>
                <p>Click a group on the left to map roles and users to it.</p>
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === "audit" && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 className="card-title">Audit Trail</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Table Name</th>
                    <th>Record ID</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td><span className={`audit-action ${log.action.toLowerCase()}`}>{log.action}</span></td>
                      <td style={{ fontWeight: 500 }}>{log.table_name}</td>
                      <td style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>{log.record_id.substring(0,8)}...</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="action-btn delete" onClick={() => handleDeleteAuditLog(log.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {showTenantModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Create Child Tenant</h3>
            <form onSubmit={handleCreateTenant}>
              <div className="form-group">
                <label className="form-label">Parent Tenant</label>
                <select className="form-input" value={selectedParentId} onChange={(e) => setSelectedParentId(e.target.value)} required>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name} (Level {t.level})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">New Tenant Name</label>
                <input className="form-input" required value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="e.g. North Farm Branch" />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTenantModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Tenant</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 600 }}>
            <h3 className="modal-title">{isEditingUser ? "Edit User" : "Create New User"}</h3>
            <form onSubmit={handleSaveUser}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" required value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} placeholder="e.g. user@skynet.farm" />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} placeholder="e.g. John Doe" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" value={userForm.phone_number} onChange={e => setUserForm({ ...userForm, phone_number: e.target.value })} placeholder="+1 555-0123" />
                </div>
                <div className="form-group">
                  <label className="form-label">User Type</label>
                  <select className="form-input" value={userForm.user_type} onChange={e => setUserForm({ ...userForm, user_type: e.target.value })}>
                    <option value="">Select a type...</option>
                    <option value="owner">Owner</option>
                    <option value="manager">Farm Manager</option>
                    <option value="farmer">Farmer</option>
                  </select>
                </div>
              </div>
              
              {!isEditingUser && (
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Password <span className="text-muted text-sm">(min 12 chars)</span></label>
                  <input type="password" minLength={12} className="form-input" required value={userForm.password || ""} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder="Super secret password..." />
                </div>
              )}

              <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid var(--border)" }} />
              
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Account Active</label>
                  <label className="switch" style={{ marginTop: 8 }}>
                    <input type="checkbox" checked={userForm.is_active} onChange={e => setUserForm({ ...userForm, is_active: e.target.checked })} />
                    <span className="slider round"></span>
                  </label>
                  <div className="text-muted text-sm" style={{ marginTop: 4 }}>Toggle to suspend user login.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiration Date <span className="text-muted text-sm">(Optional)</span></label>
                  <input type="datetime-local" className="form-input" value={userForm.expires_at} onChange={e => setUserForm({ ...userForm, expires_at: e.target.value })} />
                </div>
              </div>
              
              <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid var(--border)" }} />
              
              <div className="form-group">
                <label className="form-label">Organization (Tenant)</label>
                <select className="form-input" value={userForm.organization_id} onChange={e => setUserForm({ ...userForm, organization_id: e.target.value })}>
                  <option value="">No Organization</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name} (Level {t.level})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Groups</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)" }}>
                  {groups.length === 0 && <span className="text-muted text-sm">No groups available.</span>}
                  {groups.map(g => {
                    const isSelected = userForm.group_ids.includes(g.id);
                    return (
                      <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: isSelected ? "var(--accent)" : "transparent", color: isSelected ? "white" : "inherit", padding: "4px 8px", borderRadius: 16, border: isSelected ? "none" : "1px solid var(--border)" }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={(e) => {
                            const newIds = e.target.checked 
                              ? [...userForm.group_ids, g.id]
                              : userForm.group_ids.filter(id => id !== g.id);
                            setUserForm({ ...userForm, group_ids: newIds });
                          }}
                          style={{ display: "none" }}
                        />
                        <span style={{ fontSize: "0.85rem" }}>{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditingUser ? "Save Changes" : "Create User"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRoleModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3 className="modal-title">Create New Role</h3>
            <form onSubmit={handleCreateRole}>
              <div className="form-group">
                <label className="form-label">Role Name</label>
                <input className="form-input" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Auditor" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description..." />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Role</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 600 }}>
            <h3 className="modal-title">Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input className="form-input" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Data Entry Team" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description..." />
              </div>

              <div className="form-group">
                <label className="form-label">Select Roles</label>
                <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-subtle)' }}>
                  {roles.length > 0 ? roles.filter(r => r.parent_id === null).map(r => (
                    <div key={r.id}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, cursor: 'pointer', marginBottom: 6 }}>
                        <input type="checkbox" checked={formGroupRoleIds.includes(r.id)} onChange={(e) => {
                          if (e.target.checked) setFormGroupRoleIds(prev => [...prev, r.id]);
                          else setFormGroupRoleIds(prev => prev.filter(id => id !== r.id));
                        }} />
                        {r.name}
                      </label>
                      {roles.filter(child => child.parent_id === r.id).length > 0 && (
                        <div style={{ paddingLeft: 24, display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          {roles.filter(child => child.parent_id === r.id).map(child => (
                            <label key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer' }}>
                              <input type="checkbox" checked={formGroupRoleIds.includes(child.id)} onChange={(e) => {
                                if (e.target.checked) setFormGroupRoleIds(prev => [...prev, child.id]);
                                else setFormGroupRoleIds(prev => prev.filter(id => id !== child.id));
                              }} />
                              {child.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="text-muted text-sm">No roles available. Create roles first.</div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
