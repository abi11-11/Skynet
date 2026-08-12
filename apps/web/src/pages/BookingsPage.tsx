import { useState, useMemo } from "react";

const SERVICES = [
  { id: "PRECISION_SPOT_SPRAY", name: "Precision Spot Spraying", ratePerAcre: 800, volumePerAcre: 10, icon: "🎯" },
  { id: "FULL_FIELD_SPRAY", name: "Full Field Spraying", ratePerAcre: 600, volumePerAcre: 15, icon: "💨" },
  { id: "MAPPING_SURVEY", name: "Mapping Survey", ratePerAcre: 1200, volumePerAcre: 0, icon: "📡" },
];

// Demo bookings data
const demoBookings = [
  { id: "BK-001", plotName: "Plot A-1", service: "Precision Spot Spraying", status: "completed" as const, date: "2026-07-08", cost: 4800, pilot: "Ravi K." },
  { id: "BK-002", plotName: "Plot B-2", service: "Full Field Spraying", status: "ready_to_fly" as const, date: "2026-07-09", cost: 3600, pilot: "Suresh M." },
  { id: "BK-003", plotName: "Plot C-1", service: "Mapping Survey", status: "pending" as const, date: "2026-07-09", cost: 6000, pilot: null },
  { id: "BK-004", plotName: "Plot A-3", service: "Full Field Spraying", status: "completed" as const, date: "2026-07-07", cost: 2400, pilot: "Ravi K." },
  { id: "BK-005", plotName: "Plot B-1", service: "Precision Spot Spraying", status: "pending" as const, date: "2026-07-09", cost: 5600, pilot: null },
];

const statusConfig: Record<string, { badge: string; label: string }> = {
  pending: { badge: "badge-amber", label: "Pending" },
  ready_to_fly: { badge: "badge-blue", label: "Ready to Fly" },
  completed: { badge: "badge-green", label: "Completed" },
};

export default function BookingsPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [acres, setAcres] = useState(5);
  const [filter, setFilter] = useState<string>("all");

  const selectedService = SERVICES.find((s) => s.id === selectedServiceId);
  const cost = selectedService ? Math.round(acres * selectedService.ratePerAcre * 100) / 100 : 0;
  const volume = selectedService ? Math.round(acres * selectedService.volumePerAcre * 100) / 100 : 0;

  const filtered = filter === "all" ? demoBookings : demoBookings.filter((b) => b.status === filter);

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2>Bookings</h2>
            <p>Manage drone service bookings and missions.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ New Booking
          </button>
        </div>
      </div>
      <div className="page-body">
        {/* Filter Tabs */}
        <div className="flex gap-8 mb-20">
          {["all", "pending", "ready_to_fly", "completed"].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : statusConfig[f]?.label ?? f}
            </button>
          ))}
        </div>

        {/* Bookings Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Plot</th>
                <th>Service</th>
                <th>Pilot</th>
                <th>Date</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.id}</td>
                  <td>{b.plotName}</td>
                  <td>{b.service}</td>
                  <td>{b.pilot ?? <span style={{ color: "var(--text-muted)" }}>Unassigned</span>}</td>
                  <td>{b.date}</td>
                  <td style={{ fontWeight: 600 }}>₹{b.cost.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${statusConfig[b.status]?.badge}`}>
                      {statusConfig[b.status]?.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="empty-state mt-20">
            <div className="empty-icon">🚁</div>
            <h3>No bookings match this filter</h3>
          </div>
        )}

        {/* New Booking Modal */}
        {showModal && (
          <div className="modal-backdrop" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Book Drone Service</h3>

              <div className="form-group">
                <label className="form-label">Plot Area (Acres)</label>
                <input
                  type="number"
                  className="form-input"
                  value={acres}
                  min={0.5}
                  step={0.5}
                  onChange={(e) => setAcres(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Service</label>
                <div className="flex flex-col gap-8">
                  {SERVICES.map((s) => (
                    <div
                      key={s.id}
                      className={`service-card ${selectedServiceId === s.id ? "selected" : ""}`}
                      onClick={() => setSelectedServiceId(s.id)}
                    >
                      <div className="flex items-center gap-12">
                        <span style={{ fontSize: "1.4rem" }}>{s.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div className="text-sm text-muted">
                            ₹{s.ratePerAcre}/Acre
                            {s.volumePerAcre > 0 ? ` • ${s.volumePerAcre}L/Acre` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedService && (
                <div className="quote-box">
                  <div style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>
                    Exact Quote
                  </div>
                  <div className="flex justify-between" style={{ marginBottom: 4 }}>
                    <span className="text-muted">Total Cost</span>
                    <span style={{ fontWeight: 700, fontSize: "1.2rem" }}>₹{cost.toFixed(2)}</span>
                  </div>
                  {volume > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted">Chemical Required</span>
                      <span style={{ fontWeight: 600 }}>{volume.toFixed(1)} L</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-12 mt-24">
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={!selectedService}
                  onClick={() => {
                    alert(`Booking confirmed!\nService: ${selectedService?.name}\nCost: ₹${cost.toFixed(2)}`);
                    setShowModal(false);
                    setSelectedServiceId(null);
                  }}
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
