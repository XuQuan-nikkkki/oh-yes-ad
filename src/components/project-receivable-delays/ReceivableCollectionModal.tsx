"use client";

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
};

const ReceivableCollectionModal = ({
  open,
  loading = false,
  onCancel,
  onSubmit,
  expectedAmount,
  actualAmount,
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
      }}
    />
  );
};

export default ReceivableCollectionModal;
