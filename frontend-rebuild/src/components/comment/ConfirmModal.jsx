import { createPortal } from 'react-dom'
import { useLang } from '../../context/LangContext'

function ConfirmModal({ message, onConfirm, onCancel }) {
    const { t } = useLang();
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-80 rounded-fwm-lg bg-fwm-card p-6 shadow-fwm">
                <p className="text-sm text-fwm-text">{message}</p>
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={onCancel} className="rounded-fwm-pill px-4 py-2 font-head text-sm font-bold text-fwm-muted hover:text-fwm-text">
                        {t.comment.cancel}
                    </button>
                    <button onClick={onConfirm} className="rounded-fwm-pill bg-fwm-pink px-4 py-2 font-head text-sm font-bold text-white hover:brightness-95">
                        {t.comment.deleteAction}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}


export default ConfirmModal