import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

global.WebSocket = ws as any;

const SUPABASE_URL = 'https://fekumutorvywvivmgtaz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZla3VtdXRvcnZ5d3Zpdm1ndGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDQ0MTEsImV4cCI6MjA5NjkyMDQxMX0.nL3dQKcJqJfOwEwChmGvtHWBw178L2XTrL2oPI4tvkk';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZla3VtdXRvcnZ5d3Zpdm1ndGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTM0NDQxMSwiZXhwIjoyMDk2OTIwNDExfQ.XOt0Q-mQrvtp137BRE0_R3jcT5sbaMZCqPeOsQC9xb8';

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const tenantAClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const tenantBClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runValidation() {
  console.log('--- Starting Tenant RLS Validation ---');
  
  const emailA = `tenantA_${Date.now()}@test.com`;
  const emailB = `tenantB_${Date.now()}@test.com`;
  const password = 'Password123!';

  try {
    // 1. Create Users
    console.log('Creating test users...');
    const { data: userA, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA, password, email_confirm: true
    });
    const { data: userB, error: errB } = await adminClient.auth.admin.createUser({
      email: emailB, password, email_confirm: true
    });

    if (errA || errB) throw new Error('Failed to create users');
    console.log(`Created Tenant A (${userA.user.id}) and Tenant B (${userB.user.id})`);

    // 2. Sign In
    await tenantAClient.auth.signInWithPassword({ email: emailA, password });
    await tenantBClient.auth.signInWithPassword({ email: emailB, password });

    // 3. Insert Plot as Tenant A
    console.log('\nTenant A is creating a farm plot...');
    const { data: plot, error: plotErr } = await tenantAClient
      .from('farm_plots')
      .insert({
        owner_id: userA.user.id,
        name: 'Alpha Plot',
        area: 'POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'
      })
      .select()
      .single();

    if (plotErr) throw new Error('Tenant A failed to insert plot: ' + JSON.stringify(plotErr));
    console.log('Plot created:', plot.id);

    // 4. Validate Isolation (Tenant B should not see Tenant A's plot)
    console.log('\nTenant B is querying farm plots (should return 0)...');
    const { data: bPlots, error: bErr } = await tenantBClient.from('farm_plots').select('*');
    if (bErr) throw new Error('Tenant B query failed');
    
    if (bPlots.length > 0) {
      throw new Error(`RLS FAILURE: Tenant B can see Tenant A's plots! (Found ${bPlots.length} plots)`);
    }
    console.log('✅ SUCCESS: Tenant B cannot see Tenant A\'s plots.');

    // 5. Test Assignment RLS (Tenant A assigns Plot to Tenant B)
    console.log('\nTenant A is assigning the plot to Tenant B...');
    const { error: assignErr } = await tenantAClient
      .from('farm_plot_assignments')
      .insert({
        plot_id: plot.id,
        user_id: userB.user.id
      });
      
    if (assignErr) throw new Error('Failed to assign plot: ' + JSON.stringify(assignErr));
    console.log('Assignment created successfully.');

    // 6. Validate Shared Access
    console.log('\nTenant B is querying farm plots again (should return 1)...');
    const { data: bPlotsAfter, error: bErrAfter } = await tenantBClient.from('farm_plots').select('*');
    if (bErrAfter) throw new Error('Tenant B query failed');
    
    if (bPlotsAfter.length === 1 && bPlotsAfter[0].id === plot.id) {
      console.log('✅ SUCCESS: Tenant B can now see the assigned plot via RLS.');
    } else {
      throw new Error(`RLS FAILURE: Tenant B cannot see assigned plot. Expected 1, found ${bPlotsAfter.length}`);
    }

  } catch (e) {
    console.error('\n❌ VALIDATION FAILED:', e);
  } finally {
    console.log('\nCleaning up test users...');
    // The admin client will cascade delete plots and assignments when users are deleted
    if (tenantAClient) {
      const session = await tenantAClient.auth.getSession();
      if (session.data.session?.user.id) await adminClient.auth.admin.deleteUser(session.data.session.user.id);
    }
    if (tenantBClient) {
      const session = await tenantBClient.auth.getSession();
      if (session.data.session?.user.id) await adminClient.auth.admin.deleteUser(session.data.session.user.id);
    }
    console.log('--- Validation Complete ---');
  }
}

runValidation();
