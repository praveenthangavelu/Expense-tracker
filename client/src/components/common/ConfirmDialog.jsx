import Button from "./Button";
import Modal from "./Modal";

const ConfirmDialog = ({
  isOpen,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  loading = false,
  onCancel,
  onConfirm,
}) => (
  <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="max-w-md">
    <p className="mb-6 text-[var(--text-secondary)]">{message}</p>
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="danger" loading={loading} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

export default ConfirmDialog;
