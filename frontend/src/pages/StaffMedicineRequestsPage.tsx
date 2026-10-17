import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MedicineRequest, InventoryBatch } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  ShoppingBag, Search, CheckCircle2, Clock, 
  AlertCircle, ShieldCheck, MapPin, Edit3, ArrowRight, XCircle 
} from 'lucide-react';

export const StaffMedicineRequestsPage: React.FC = () => {
  const { refreshKey, triggerRefresh, showToast, clinicSettings } = useApp();

  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Update Status Modal
  const [selectedReq, setSelectedReq] = useState<MedicineRequest | null>(null);
  const [newStatus, setNewStatus] = useState<string>('Confirmed for Collection');
  const [instructions, setInstructions] = useState('');
  const [staffNotes, setStaffNotes] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [deductStock, setDeductStock] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getMedicineRequests(),
      api.getInventoryBatches()
    ])
      .then(([reqData, batchData]) => {
        if (isMounted) {
          setRequests(reqData);
          setBatches(batchData);
        }
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || 'Failed to load medicine requests', 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [refreshKey]);

  const handleOpenUpdate = (req: MedicineRequest) => {
    setSelectedReq(req);
    setNewStatus(req.status || 'Confirmed for Collection');
    setInstructions(
      req.collection_instructions || 
      clinicSettings?.collection_instructions || 
      `Please collect at ${clinicSettings?.collection_point || 'Pharmacy Counter 1'} during dispensary hours.`
    );
    setStaffNotes(req.staff_notes || '');
    setDeductStock(false);
    setSelectedBatchId(req.dispensed_batch_id ? req.dispensed_batch_id.toString() : '');
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setUpdating(true);
    try {
      await api.updateMedicineRequestStatus(selectedReq.id, {
        status: newStatus,
        collection_instructions: instructions,
        staff_notes: staffNotes,
        dispensed_batch_id: selectedBatchId ? parseInt(selectedBatchId) : undefined,
        deduct_stock: deductStock
      });

      showToast(`Medicine Request ${selectedReq.request_reference || selectedReq.id} updated to '${newStatus}'!`, 'success');
      setSelectedReq(null);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      r.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.request_reference && r.request_reference.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeVariant = (st: string) => {
    switch (st) {
      case 'Confirmed for Collection':
      case 'Ready for Collection':
        return 'success';
      case 'Collected':
        return 'primary';
      case 'Unavailable':
      case 'Cancelled':
        return 'danger';
      case 'Pending Review':
      default:
        return 'warning';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-teal-600" />
            Patient Medicine Collection Requests
          </h1>
          <p className="text-xs text-slate-500">
            Review patient requests, confirm medicine preparation, provide collection instructions, and record authorized dispensing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient, medicine, REQ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-64 bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="All">All Statuses</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Confirmed for Collection">Confirmed for Collection</option>
            <option value="Ready for Collection">Ready for Collection</option>
            <option value="Collected">Collected</option>
            <option value="Unavailable">Unavailable</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading medicine requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No medicine collection requests found matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Requested Medicine</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Collection Point / Instructions</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                      {req.request_reference || `REQ-${req.id}`}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-navy-900">
                      {req.patient_name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {req.medicine_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      {req.requested_quantity} units
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusBadgeVariant(req.status)} size="sm">
                        {req.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={req.collection_instructions || ''}>
                      {req.collection_instructions || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenUpdate(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update Status</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      <Modal
        isOpen={selectedReq !== null}
        onClose={() => setSelectedReq(null)}
        title={`Review Request: ${selectedReq?.request_reference || selectedReq?.id}`}
        subtitle={`Patient: ${selectedReq?.patient_name} • Medicine: ${selectedReq?.medicine_name}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Request Status *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white font-semibold"
            >
              <option value="Pending Review">Pending Review</option>
              <option value="Confirmed for Collection">Confirmed for Collection</option>
              <option value="Ready for Collection">Ready for Collection (Packaged)</option>
              <option value="Collected">Collected (Handed to Patient)</option>
              <option value="Unavailable">Unavailable (Out of Stock)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Collection Instructions Shown to Patient
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Please collect at Pharmacy Counter 1 during dispensary hours."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              These details, alongside the clinic address ({clinicSettings?.clinic_address || '124 Healthcare Boulevard'}), will appear on the patient&apos;s confirmed card.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Internal Staff Notes
            </label>
            <input
              type="text"
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              placeholder="Internal pharmacy verification notes"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Optional Stock Deduction Upon Handover */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="deductStockCheck"
                checked={deductStock}
                onChange={(e) => setDeductStock(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <label htmlFor="deductStockCheck" className="text-xs font-bold text-navy-900 select-none cursor-pointer">
                Record Authorized Inventory Dispensing
              </label>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              A collection request is not an automated sale. Check this only when physically dispensing medication from an active, non-expired batch.
            </p>

            {deductStock && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Dispensing Batch *
                </label>
                <select
                  required={deductStock}
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="">-- Choose Active Batch --</option>
                  {batches.map(b => (
                    <option 
                      key={b.id} 
                      value={b.id}
                      disabled={b.is_expired}
                    >
                      {b.batch_number} • Exp: {new Date(b.expiry_date).toLocaleDateString()} • Avail: {b.available_quantity} units {b.is_expired ? '(EXPIRED - BLOCKED)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedReq(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {updating ? 'Saving...' : 'Update & Notify Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
