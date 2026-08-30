import { Spin, Flex } from "antd";

export default function LoadingState({ text = "Loading..." }) {
  return (
    <Flex align="center" justify="center" style={{ padding: "80px 0" }}>
      <Spin size="large" tip={text}>
        <div style={{ padding: 50 }} />
      </Spin>
    </Flex>
  );
}
