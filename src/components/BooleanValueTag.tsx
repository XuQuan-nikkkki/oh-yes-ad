"use client";

import { Tag } from "antd";

type Props = {
  value: boolean;
  trueText?: string;
  falseText?: string;
  trueColor?: string;
  falseColor?: string;
};

const BooleanValueTag = ({
  value,
  trueText = "是",
  falseText = "否",
  trueColor = "red",
  falseColor = "green",
}: Props) => {
  return (
    <Tag color={value ? trueColor : falseColor}>
      {value ? trueText : falseText}
    </Tag>
  );
};

export default BooleanValueTag;
