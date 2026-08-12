import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const demoInvoices = [
  { id: "INV-001", bookingId: "BK-001", amount: 4800, status: "paid", upi_link: "upi://pay?pa=skynet@upi&pn=Skynet&am=4800", pilotName: "Ravi K.", plotName: "Plot A-1", date: "2026-07-08" },
  { id: "INV-002", bookingId: "BK-004", amount: 2400, status: "paid", upi_link: "upi://pay?pa=skynet@upi&pn=Skynet&am=2400", pilotName: "Ravi K.", plotName: "Plot A-3", date: "2026-07-07" },
  { id: "INV-003", bookingId: "BK-002", amount: 3600, status: "pending", upi_link: "upi://pay?pa=skynet@upi&pn=Skynet&am=3600", pilotName: "Suresh M.", plotName: "Plot B-2", date: "2026-07-09" },
  { id: "INV-004", bookingId: "BK-003", amount: 6000, status: "pending", upi_link: "upi://pay?pa=skynet@upi&pn=Skynet&am=6000", pilotName: null, plotName: "Plot C-1", date: "2026-07-09" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState(demoInvoices);
  const [qrModal, setQrModal] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const simulatePayment = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: "paid" } : inv))
    );
  };

  const submitReview = () => {
    if (rating === 0) return;
    alert(`Review submitted!\nRating: ${"★".repeat(rating)}${"☆".repeat(5 - rating)}\nComment: ${comment || "(none)"}`);
    setReviewModal(null);
    setRating(0);
    setComment("");
  };

  const activeQrInvoice = invoices.find((i) => i.id === qrModal);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <div className="page-header">
        <h2>Invoices & Payments</h2>
        <p>View invoices, make UPI payments, and rate pilots.</p>
      </div>
      <div className="page-body">
        {/* Summary */}
        <div className="grid-3 mb-20">
          <div className="stat-card">
            <div className="stat-icon green">🧾</div>
            <div>
              <div className="stat-value">{invoices.length}</div>
              <div className="stat-label">Total Invoices</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div>
              <div className="stat-value" style={{ color: "var(--accent)" }}>₹{totalPaid.toLocaleString()}</div>
              <div className="stat-label">Paid</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">⏳</div>
            <div>
              <div className="stat-value" style={{ color: "var(--amber)" }}>₹{totalPending.toLocaleString()}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Plot</th>
                <th>Pilot</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{inv.id}</td>
                  <td>{inv.plotName}</td>
                  <td>{inv.pilotName ?? <span className="text-muted">—</span>}</td>
                  <td>{inv.date}</td>
                  <td style={{ fontWeight: 700 }}>₹{inv.amount.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${inv.status === "paid" ? "badge-green" : "badge-amber"}`}>
                      {inv.status === "paid" ? "Paid" : "Pending"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-8">
                      {inv.status === "pending" && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => setQrModal(inv.id)}>
                            Pay via UPI
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => simulatePayment(inv.id)}>
                            Simulate Pay
                          </button>
                        </>
                      )}
                      {inv.status === "paid" && inv.pilotName && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setReviewModal(inv.id)}>
                          ⭐ Rate Pilot
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* QR Code Modal */}
        {activeQrInvoice && (
          <div className="modal-backdrop" onClick={() => setQrModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
              <h3 className="modal-title">Pay ₹{activeQrInvoice.amount.toLocaleString()}</h3>
              <p className="text-muted mb-20">Scan this QR code with your UPI app to pay securely.</p>
              <div style={{ background: "#fff", display: "inline-block", padding: 24, borderRadius: 16 }}>
                <QRCodeSVG value={activeQrInvoice.upi_link} size={200} level="H" />
              </div>
              <p className="text-sm text-muted mt-12" style={{ wordBreak: "break-all" }}>
                {activeQrInvoice.upi_link}
              </p>
              <div className="flex gap-12 mt-24">
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setQrModal(null)}>
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    simulatePayment(activeQrInvoice.id);
                    setQrModal(null);
                  }}
                >
                  Simulate Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewModal && (
          <div className="modal-backdrop" onClick={() => setReviewModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Rate Your Pilot</h3>
              <p className="text-muted mb-16">Your feedback helps maintain a high-quality drone network.</p>

              <div className="star-rating mb-16" style={{ justifyContent: "center" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${rating >= star ? "filled" : ""}`}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Comment (optional)</label>
                <textarea
                  className="form-input"
                  placeholder="Great service, very professional…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="flex gap-12 mt-20">
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setReviewModal(null); setRating(0); setComment(""); }}>
                  Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={rating === 0} onClick={submitReview}>
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
