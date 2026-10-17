import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MedicineCatalogue, InventoryBatch, MedicineRequest } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { 
  Pill, AlertTriangle, AlertOctagon, CheckCircle2, 
  Plus, ArrowDownRight, ArrowUpRight, Search, ShieldAlert, ShoppingBag
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { refreshKey, triggerRefresh, showToast } = useApp();
  const [catalogue, setCatalogue] = useState<MedicineCatalogue[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'batches' | 'catalogue' | 'requests'>('batches');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Dispense Modal
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatch | null>(null);
  const [dispenseQty, setDispenseQty] = useState(10);
  const [dispenseReason, setDispenseReason] = useState('Prescription OPD Dispensing');
  const [dispensing, setDispensing] = useState(false);
  const [dispenseError, setDispenseError] = useState<string | null>(null);

  // Restock Modal
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockQty, setRestockQty] = useState(50);
  const [restocking, setRestocking] = useState(false);

  // Add Batch Modal
  const [addBatchModalOpen, setAddBatchModalOpen] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    medicine_id: '',
    batch_number: '',
    expiry_date: '',
    available_quantity: 100,
    reorder_threshold: 25,
    purchase_price: 5.0,
    mrp: 10.0
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getCatalogue(undefined, search),
      api.getInventoryBatches(statusFilter === 'All' ? undefined : statusFilter),
      api.getMedicineRequests()
    ])
      .then(([catData, batchData, reqData]) => {
        if (isMounted) {
          setCatalogue(catData);
          setBatches(batchData);
          setRequests(reqData);
        }
      })
      .catch((err) => {
        if (isMounted) showToast(err.message || 'Failed to fetch inventory', 'error');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey, search, statusFilter]);

  const handleDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setDispensing(true);
    setDispenseError(null);

    try {
      const res = await api.dispenseStock({
        batch_id: selectedBatch.id,
        quantity: dispenseQty,
        reason: dispenseReason,
        performed_by: 'Dispensary Staff'
      });

      showToast(res.message, 'success');
      setDispenseModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      setDispenseError(err.message || 'Dispensing failed');
    } finally {
      setDispensing(false);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setRestocking(true);
    try {
      const res = await api.restockInventory({
        batch_id: selectedBatch.id,
        quantity: restockQty,
        reason: 'Pharmacy replenishment',
        performed_by: 'Staff'
      });


      showToast(res.message, 'success');
      setRestockModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Restock failed', 'error');
    } finally {
      setRestocking(false);
    }
  };

  const handleAddBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchData.medicine_id || !newBatchData.batch_number || !newBatchData.expiry_date) {
      showToast('Please fill all required batch fields.', 'error');
      return;
    }

    try {
      await api.addInventoryBatch({
        medicine_id: parseInt(newBatchData.medicine_id),
        batch_number: newBatchData.batch_number,
        expiry_date: newBatchData.expiry_date,
        available_quantity: newBatchData.available_quantity,
        initial_quantity: newBatchData.available_quantity,
        reorder_threshold: newBatchData.reorder_threshold,
        purchase_price: newBatchData.purchase_price,
        mrp: newBatchData.mrp
      });

      showToast(`Batch ${newBatchData.batch_number} added successfully!`, 'success');
      setAddBatchModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to add batch', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-navy-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" />
            Medicine Inventory & Pharmacy Management
          </h1>
          <p className="text-xs text-slate-500">
            Batch-level tracking, automated 30-day expiry warnings, and strict safety blocks on expired stock.
          </p>
        </div>

        <button
          onClick={() => setAddBatchModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Intake New Batch</span>
        </button>
      </div>

      {/* Safety & Expiry Protocol Alert */}
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-950">
        <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Drug Safety Enforcement: </span>
          <p className="text-rose-800 leading-relaxed">
            Expired stock (e.g. Batch CET-2023-EXP) is strictly prohibited from dispensing. The backend API validates batch expiration against today's date and rejects unauthorized dispensing requests.
          </p>
        </div>
      </div>

      {/* Tabs Switcher & Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setViewTab('batches')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              viewTab === 'batches' ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inventory Batches ({batches.length})
          </button>
          <button
            onClick={() => setViewTab('catalogue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              viewTab === 'catalogue' ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Catalogue ({catalogue.length})
          </button>
          <button
            onClick={() => setViewTab('requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              viewTab === 'requests' ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Patient Requests ({requests.length})
          </button>
        </div>

        {viewTab === 'batches' && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {['All', 'Active', 'Expiring Soon', 'Low Stock', 'Expired'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex-shrink-0 ${
                  statusFilter === st
                    ? 'bg-teal-700 text-white font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View: Inventory Batches Table */}
      {viewTab === 'batches' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Available Stock</th>
                  <th className="py-3 px-4">MRP / Purchase</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading inventory batches...
                    </td>
                  </tr>
                ) : batches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No inventory batches match this filter.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        b.is_expired ? 'bg-rose-50/40' : b.is_expiring_soon ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {b.batch_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{b.medicine?.name || 'Medicine'}</div>
                        <div className="text-[11px] text-slate-500">
                          {b.medicine?.strength_formulation} • {b.medicine?.category}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className={`font-mono font-semibold ${b.is_expired ? 'text-rose-700 font-bold' : b.is_expiring_soon ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>
                          {b.expiry_date}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {b.is_expired
                            ? `Expired ${Math.abs(b.days_to_expiry)} days ago`
                            : b.is_expiring_soon
                            ? `Expires in ${b.days_to_expiry} days`
                            : `${b.days_to_expiry} days remaining`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sm text-slate-900">
                          {b.available_quantity} <span className="text-[10px] text-slate-400 font-normal">units</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Reorder threshold: {b.reorder_threshold}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-mono">
                        ₹{b.mrp.toFixed(2)} <span className="text-slate-400 text-[10px]">(Buy: ₹{b.purchase_price.toFixed(2)})</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            b.is_expired
                              ? 'danger'
                              : b.is_expiring_soon
                              ? 'warning'
                              : b.available_quantity <= b.reorder_threshold
                              ? 'warning'
                              : 'success'
                          }
                          size="sm"
                        >
                          {b.is_expired ? 'EXPIRED' : b.is_expiring_soon ? 'EXPIRING SOON' : b.available_quantity <= b.reorder_threshold ? 'LOW STOCK' : 'ACTIVE'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Dispense button (triggers validation!) */}
                          <button
                            onClick={() => {
                              setSelectedBatch(b);
                              setDispenseQty(10);
                              setDispenseError(null);
                              setDispenseModalOpen(true);
                            }}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                              b.is_expired
                                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                            }`}
                            title={b.is_expired ? 'Expired batch test' : 'Dispense to patient'}
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>{b.is_expired ? 'Dispense (Blocked)' : 'Dispense'}</span>
                          </button>

                          {/* Restock button */}
                          <button
                            onClick={() => {
                              setSelectedBatch(b);
                              setRestockQty(50);
                              setRestockModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Add stock intake"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View: Medicine Catalogue Table */}
      {viewTab === 'catalogue' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Brand & Generic Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Prescription Required?</th>
                <th className="py-3 px-4">Total Stock</th>
                <th className="py-3 px-4">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {catalogue.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-800">{m.code}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{m.name}</div>
                    <div className="text-[11px] text-slate-500">{m.generic_name} • {m.strength_formulation}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{m.category}</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={m.prescription_required ? 'warning' : 'neutral'} size="sm">
                      {m.prescription_required ? 'Rx Required' : 'OTC / Open'}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {m.total_stock} units
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-800">₹{m.unit_price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View: Patient Medicine Requests */}
      {viewTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Request #</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Requested Medicine</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono text-slate-500">#{r.id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{r.patient_name}</td>
                  <td className="py-3.5 px-4 font-semibold text-teal-900">{r.medicine_name}</td>
                  <td className="py-3.5 px-4 text-slate-700">{r.requested_quantity} units</td>
                  <td className="py-3.5 px-4">
                    <Badge variant={r.status === 'Confirmed for Collection' || r.status === 'Ready for Collection' || r.status === 'Collected' ? 'success' : r.status === 'Unavailable' || r.status === 'Cancelled' ? 'danger' : 'warning'} size="sm">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{r.notes || r.staff_notes || '—'}</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dispense Modal with Safety Enforcement */}
      <Modal
        isOpen={dispenseModalOpen}
        onClose={() => setDispenseModalOpen(false)}
        title="Dispense Medicine Stock"
        subtitle={selectedBatch ? `Batch: ${selectedBatch.batch_number} • Available: ${selectedBatch.available_quantity} units` : ''}
        maxWidth="sm"
      >
        <form onSubmit={handleDispenseSubmit} className="space-y-4">
          {selectedBatch?.is_expired && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-950">
                <AlertOctagon className="w-4 h-4 text-rose-600" /> SAFETY WARNING: EXPIRED BATCH
              </span>
              <p>
                This batch expired on {selectedBatch.expiry_date}. Submitting will demonstrate the system's hardcoded safety block.
              </p>
            </div>
          )}

          {dispenseError && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs font-semibold text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{dispenseError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity to Dispense *
            </label>
            <input
              type="number"
              min={1}
              required
              value={dispenseQty}
              onChange={(e) => setDispenseQty(parseInt(e.target.value) || 1)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Prescription ID
            </label>
            <input
              type="text"
              value={dispenseReason}
              onChange={(e) => setDispenseReason(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDispenseModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={dispensing}
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors ${
                selectedBatch?.is_expired ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {dispensing ? 'Verifying...' : selectedBatch?.is_expired ? 'Test Dispense Block' : 'Authorise Dispense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Restock Modal */}
      <Modal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        title="Restock Inventory Batch"
        subtitle={selectedBatch ? `Batch: ${selectedBatch.batch_number}` : ''}
        maxWidth="sm"
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Units to Add *
            </label>
            <input
              type="number"
              min={1}
              required
              value={restockQty}
              onChange={(e) => setRestockQty(parseInt(e.target.value) || 1)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRestockModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={restocking}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              {restocking ? 'Adding...' : 'Confirm Restock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add New Batch Modal */}
      <Modal
        isOpen={addBatchModalOpen}
        onClose={() => setAddBatchModalOpen(false)}
        title="Intake New Inventory Batch"
        subtitle="Registers a newly received shipment lot with expiry tracking."
        maxWidth="md"
      >
        <form onSubmit={handleAddBatchSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Catalogue Medicine *
            </label>
            <select
              required
              value={newBatchData.medicine_id}
              onChange={(e) => setNewBatchData({ ...newBatchData, medicine_id: e.target.value })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-white"
            >
              <option value="">-- Choose medicine --</option>
              {catalogue.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.strength_formulation}) - {m.category}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batch Lot Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PCM-2025-C2"
                value={newBatchData.batch_number}
                onChange={(e) => setNewBatchData({ ...newBatchData, batch_number: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={newBatchData.expiry_date}
                onChange={(e) => setNewBatchData({ ...newBatchData, expiry_date: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min={1}
                required
                value={newBatchData.available_quantity}
                onChange={(e) => setNewBatchData({ ...newBatchData, available_quantity: parseInt(e.target.value) || 0 })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reorder Threshold
              </label>
              <input
                type="number"
                min={1}
                value={newBatchData.reorder_threshold}
                onChange={(e) => setNewBatchData({ ...newBatchData, reorder_threshold: parseInt(e.target.value) || 0 })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MRP (₹)
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                value={newBatchData.mrp}
                onChange={(e) => setNewBatchData({ ...newBatchData, mrp: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddBatchModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
            >
              Save Batch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
