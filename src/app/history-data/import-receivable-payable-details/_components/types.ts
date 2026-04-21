export type ReceivableNodeDraft = {
  key: string;
  stageName: string;
  keyDeliverable: string;
  expectedAmountTaxIncluded: number | null;
  expectedDate: string;
  actualAmountTaxIncluded: number | null;
  actualDate: string;
  remark: string;
  remarkNeedsAttention: boolean;
};

export type ReceivableEntryDraft = {
  key: string;
  contractCompany: string;
  brandName: string;
  serviceContent: string;
  ownerName: string;
  contractAmountTaxIncluded: number | null;
  projectStatus: string;
  hasVendorPayment: boolean | null;
  remark: string;
  remarkNeedsAttention: boolean;
  nodes: ReceivableNodeDraft[];
};

export type PayableEntryDraft = {
  key: string;
  contractCompany: string;
  brandName: string;
  serviceContent: string;
  vendorFullName: string;
  vendorShortName: string;
  supplierName: string;
  ownerName: string;
  contractAmount: number | null;
  projectStatus: string;
  hasCustomerCollection: boolean | null;
  nodes: PayableNodeDraft[];
};

export type PayableNodeDraft = {
  key: string;
  stageName: string;
  paymentCondition: string;
  expectedAmountTaxIncluded: number | null;
  expectedDate: string;
  actualAmountTaxIncluded: number | null;
  actualDate: string;
  remark: string;
};
