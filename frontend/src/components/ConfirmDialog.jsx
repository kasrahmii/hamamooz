import { Modal, Alert } from "antd";

export default function ConfirmDialog({
  open,
  title,
  description,
  okText = "Delete",
  confirmLoading = false,
  error = null,
  onConfirm,
  onCancel,
  danger = true,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={onConfirm}
      okText={okText}
      cancelText="Cancel"
      confirmLoading={confirmLoading}
      okButtonProps={{ danger }}
    >
      {description}
      {error && (
        <Alert
          type="error"
          showIcon
          message="Error"
          description={error}
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  );
}
