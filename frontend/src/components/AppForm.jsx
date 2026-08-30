import { useEffect, useRef } from "react";
import { Form, Input, InputNumber, Button, Space } from "antd";

export default function AppForm({
  initialValues,
  loading = false,
  error = null,
  submitLabel = "Create",
  onSubmit,
  onCancel,
  formRef,
}) {
  const [form] = Form.useForm();

  if (formRef) {
    formRef.current = form;
  }

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  const onFinish = (values) => {
    onSubmit(values);
  };

  return (
    <>
      {error && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#ff4d4f", fontSize: 14 }}>{error}</div>
        </div>
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          image: "",
          replicas: 1,
          cpu: "100m",
          memory: "128Mi",
          ...initialValues,
        }}
        disabled={loading}
      >
        <Form.Item
          label="Image"
          name="image"
          rules={[{ required: true, message: "Please enter an image" }]}
        >
          <Input placeholder="nginx:latest" />
        </Form.Item>

        <Form.Item
          label="Replicas"
          name="replicas"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="CPU" name="cpu">
          <Input placeholder="100m" />
        </Form.Item>

        <Form.Item label="Memory" name="memory">
          <Input placeholder="128Mi" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {submitLabel}
            </Button>
            {onCancel && <Button onClick={onCancel}>Cancel</Button>}
          </Space>
        </Form.Item>
      </Form>
    </>
  );
}
