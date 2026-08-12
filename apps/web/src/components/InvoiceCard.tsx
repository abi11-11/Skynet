import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { FeedbackForm } from './FeedbackForm';

interface Invoice {
  id: string;
  amount: number;
  status: string;
  upi_link: string;
}

export const InvoiceCard = ({ bookingId, pilotId }: { bookingId: string, pilotId: string }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('booking_id', bookingId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching invoice", error);
        } else if (data) {
          setInvoice(data);
          
          if (data.status === 'paid') {
            const { count } = await supabase
              .from('pilot_reviews')
              .select('*', { count: 'exact', head: true })
              .eq('booking_id', bookingId);
            if (count && count > 0) {
              setHasReviewed(true);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [bookingId]);

  const handleSimulatePayment = async () => {
    if (!invoice) return;
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoice.id);
    if (!error) {
      setInvoice({ ...invoice, status: 'paid' });
    }
  };

  if (loading) return <div className="p-4 border rounded-lg bg-gray-50 text-gray-500">Loading invoice...</div>;
  if (!invoice) return <div className="p-4 border rounded-lg bg-gray-50 text-gray-500">No invoice generated yet.</div>;

  return (
    <div className="p-6 border rounded-xl shadow-sm bg-white mt-4">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Mission Invoice</h3>
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <span className="text-gray-600">Total Amount:</span>
        <span className="text-2xl font-bold text-gray-900">₹{invoice.amount.toFixed(2)}</span>
      </div>

      {invoice.status === 'pending' ? (
        <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800 font-medium mb-4 text-center">
            Scan this QR code with your UPI app to pay securely.
          </p>
          <div className="bg-white p-4 rounded-xl shadow-inner border">
            <QRCodeSVG value={invoice.upi_link} size={200} level="H" />
          </div>
          <p className="text-xs text-gray-500 mt-4 break-all text-center">
            {invoice.upi_link}
          </p>
          <button 
            onClick={handleSimulatePayment}
            style={{ marginTop: 12, padding: "8px 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Simulate Payment (Dev Only)
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-full flex items-center justify-center p-6 bg-green-50 rounded-lg text-green-700 font-bold text-lg mb-4">
            ✅ Invoice Paid in Full
          </div>
          
          {!hasReviewed && pilotId && (
            <div className="w-full">
              <FeedbackForm 
                bookingId={bookingId} 
                pilotId={pilotId} 
                onSubmitted={() => setHasReviewed(true)} 
              />
            </div>
          )}
          
          {hasReviewed && (
            <div className="w-full p-4 bg-gray-50 rounded-lg text-gray-600 text-center">
              Thank you for your feedback!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
