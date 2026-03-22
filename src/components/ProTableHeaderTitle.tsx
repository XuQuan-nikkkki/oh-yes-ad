"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const ProTableHeaderTitle = ({ children }: Props) => {
  return <h3 style={{ margin: 0 }}>{children}</h3>;
};

export default ProTableHeaderTitle;
