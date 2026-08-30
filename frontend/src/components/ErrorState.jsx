import { Alert } from "antd";

export default function ErrorState({ message, onRetry }) {
  return (
    <Alert
      type="error"
      showIcon
      message="Error"
      description={message}
      action={
        onRetry && (
          <a onClick={onRetry} style={{ cursor: "pointer" }}>
            Retry
          </a>
        )
      }
      style={{ marginTop: 24 }}
    />
  );
}
