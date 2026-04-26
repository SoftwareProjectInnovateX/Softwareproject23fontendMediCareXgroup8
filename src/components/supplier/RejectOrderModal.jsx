import ModalWrap from './ModalWrap';

const RejectOrderModal = ({ order, rejectReason, setRejectReason, onConfirm, onClose }) => {
  if (!order) return null;

  return (
    <ModalWrap onClose={onClose} maxW="max-w-[500px]">
      <div className="flex justify-between items-center px-7 py-6 border-b-2 border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 m-0">Reject Order</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-3xl text-slate-400 bg-transparent border-none cursor-pointer rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >×</button>
      </div>

      <div className="p-7">
        <p className="text-[15px] text-slate-800 mb-2">
          You are about to reject order <strong>{order.poId}</strong>
        </p>
        <p className="text-sm text-slate-500 mb-6">
          Product: {order.product || order.productName}
        </p>

        <div className="flex flex-col mb-6">
          <label className="text-[15px] font-semibold text-slate-800 mb-2">
            Reason for Rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Out of stock, Product discontinued, Pricing issue..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-sm font-[inherit] resize-y transition-all duration-200 focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-400/10 box-border"
          />
        </div>

        <div className="flex gap-3 pt-5 border-t-2 border-slate-100">
          <button
            onClick={onConfirm}
            disabled={!rejectReason.trim()}
            className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg border-none cursor-pointer transition-all duration-200"
          >
            Confirm Rejection
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg border-none cursor-pointer transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalWrap>
  );
};

export default RejectOrderModal;