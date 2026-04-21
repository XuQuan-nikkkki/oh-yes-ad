"use client";

import { Button, message } from "antd";
import { copyTextToClipboard } from "@/lib/copyToClipboard";

type Props = {
  text: string;
};
const CopyTextButton = ({ text }: Props) => {
  return (
    <Button
      key="copy"
      type="primary"
      onClick={async () => {
        try {
          await copyTextToClipboard(text);
          message.success("已复制");
        } catch {
          message.error("复制失败，请手动复制");
        }
      }}
    >
      复制
    </Button>
  );
};

export default CopyTextButton;
