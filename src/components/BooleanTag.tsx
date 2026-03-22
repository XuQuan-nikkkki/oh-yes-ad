"use client";

import BooleanValueTag from "@/components/BooleanValueTag";

type Props = {
  value: boolean;
  trueText?: string;
  falseText?: string;
  trueColor?: string;
  falseColor?: string;
};

const BooleanTag = (props: Props) => {
  return <BooleanValueTag {...props} />;
};

export default BooleanTag;
