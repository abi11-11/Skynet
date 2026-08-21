import { useState } from "react";
import type { FarmPlot } from "@skynet/types";

export default function FinancialDashboard({ plot }: { plot: FarmPlot }) {
  // Budget & Financial State
  const [targetYieldTonnes, setTargetYieldTonnes] = useState(3.5);
  const [expectedPrice, setExpectedPrice] = useState(22000); // Price per tonne
  
  const [budgetedMaterials, setBudgetedMaterials] = useState(25000);
  const [budgetedLabor, setBudgetedLabor] = useState(12000);
  const [budgetedMachinery, setBudgetedMachinery] = useState(8000);
  
  const actualExpenses = 18400; // Mock current expenses
  const plotSizeHectares = 2.5; // Mock size

  // Computed Values
  const totalBudget = budgetedMaterials + budgetedLabor + budgetedMachinery;
  const targetRevenue = targetYieldTonnes * expectedPrice;
  const projectedMargin = targetRevenue - totalBudget;
  const roi = ((projectedMargin / totalBudget) * 100).toFixed(1);
  const costPerHectare = (totalBudget / plotSizeHectares).toFixed(0);
  const breakEvenYield = totalBudget / expectedPrice;
  const burnRate = actualExpenses / totalBudget;

  const [transactions] = useState([
    { id: "1", date: "Aug 12", desc: "Urea fertilizer (50kg)", category: "Materials", amount: -1200 },
    { id: "2", date: "Aug 10", desc: "Puddling tractor rent", category: "Machinery", amount: -4500 },
    { id: "3", date: "Aug 05", desc: "Seedling purchase", category: "Materials", amount: -8000 },
    { id: "4", date: "Aug 02", desc: "Labor (Sowing)", category: "Labor", amount: -4700 },
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* Top KPI Cards */}
      <div className="grid-4">
        <div className="card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>Projected Gross Margin</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: projectedMargin > 0 ? "var(--green)" : "var(--red)" }}>
            ₹{projectedMargin.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>Projected ROI</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: Number(roi) > 0 ? "var(--green)" : "var(--red)" }}>
            {roi}%
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>Cost per Hectare</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
            ₹{Number(costPerHectare).toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>Break-even Yield</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--amber)" }}>
            {breakEvenYield.toFixed(2)} t
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Budget Progress */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Budget Execution</h3>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Actual vs Budget</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>₹{actualExpenses.toLocaleString()} / ₹{totalBudget.toLocaleString()}</span>
            </div>
            <div style={{ width: "100%", height: 12, background: "var(--bg-subtle)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(burnRate * 100, 100)}%`, height: "100%", background: burnRate > 0.9 ? "var(--red)" : burnRate > 0.75 ? "var(--amber)" : "var(--green)" }} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8 }}>
              {Math.round(burnRate * 100)}% of budget utilized.
            </div>
          </div>
        </div>

        {/* What-If Scenario Planning */}
        <div className="card" style={{ border: '1px solid var(--border-accent)' }}>
           <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
             <span style={{ fontSize: '1.2rem' }}>🔮</span>
             <h3 className="card-title">What-If Scenario Planning</h3>
           </div>
           <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <div style={{ flex: 1 }}>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Target Yield (Tonnes)</div>
                 <input 
                   type="range" 
                   min="1" max="10" step="0.5" 
                   value={targetYieldTonnes} 
                   onChange={(e) => setTargetYieldTonnes(Number(e.target.value))}
                   style={{ width: '100%' }}
                 />
               </div>
               <div style={{ width: 60, textAlign: 'right', fontWeight: 600 }}>{targetYieldTonnes.toFixed(1)} t</div>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <div style={{ flex: 1 }}>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Market Price (₹/Tonne)</div>
                 <input 
                   type="range" 
                   min="15000" max="35000" step="500" 
                   value={expectedPrice} 
                   onChange={(e) => setExpectedPrice(Number(e.target.value))}
                   style={{ width: '100%' }}
                 />
               </div>
               <div style={{ width: 60, textAlign: 'right', fontWeight: 600 }}>{expectedPrice / 1000}k</div>
             </div>

           </div>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="card-title">Recent Transactions</h3>
          <button className="btn btn-primary btn-sm">+ Record Expense</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", background: "var(--bg-subtle)" }}>
                <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>Date</th>
                <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>Description</th>
                <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>Category</th>
                <th style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500, textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t.date}</td>
                  <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "var(--text-primary)" }}>{t.desc}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="badge" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                      {t.category}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.9rem", fontWeight: 600, color: "var(--red)", textAlign: "right" }}>
                    {t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
