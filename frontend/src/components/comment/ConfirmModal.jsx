import { createPortal } from 'react-dom';

function ConfirmModal({ message, onConfirm, onCancel }) {
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" >
            <div className="w-80 rounded-fwm-lg bg-fwm-card p-6 shadow-xl">
                <p className="text-sm text-fwm-text">{message}</p>
                <div className="mt-5 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="rounded-fwm-pill px-4 py-2 text-sm font-bold text-fwm-muted hover:text-fwm-text"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        className="rounded-fwm-pill bg-red-500 px-4 py-2 text-sm font-bold text-white hover:brightness-95"
                    >
                        Xóa
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default ConfirmModal;