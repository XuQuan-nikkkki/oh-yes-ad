"use client";

import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

type Props = {
  onClick: () => void;
  btnText?: string;
  key?: React.Key;
  disabled?: boolean;
};
const CreateButton = ({
  btnText = "新建",
  onClick,
  key = "create-btn",
  disabled = false,
}: Props) => {
  return (
    <Button
      key={key}
      type="primary"
      icon={<PlusOutlined />}
      disabled={disabled}
      onClick={onClick}
    >
      {btnText}
    </Button>
  );
};

export default CreateButton;
