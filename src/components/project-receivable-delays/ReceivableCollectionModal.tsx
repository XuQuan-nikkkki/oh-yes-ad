"use client";

import dayjs from "dayjs";
import ProjectReceivableActualNodeModal, {
  type ProjectReceivableActualNodeFormValues,
} from "@/components/project-detail/ProjectReceivableActualNodeModal";

type Props = {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (
    values: ProjectReceivableActualNodeFormValues,
  ) => void | Promise<void>;
  expectedAmount: number;
  actualAmount: number;
  expectedDate?: string | null;
};

const ReceivableCollectionModal = ({
  open,
  loading = false,
  onCancel,
  onSubmit,
  expectedAmount,
  actualAmount,
  expectedDate,
}: Props) => {
  const remainingAmount = Math.max(
    Number(expectedAmount ?? 0) - Number(actualAmount ?? 0),
    0,
  );

  return (
    <ProjectReceivableActualNodeModal
      open={open}
      loading={loading}
      title="收款"
      onCancel={onCancel}
      onSubmit={onSubmit}
      maxAmountTaxIncluded={remainingAmount}
      initialValues={{
        actualAmountTaxIncluded: remainingAmount,
        actualDate: expectedDate ? dayjs(expectedDate) : undefined,
      }}
    />
  );
};

export default ReceivableCollectionModal;
