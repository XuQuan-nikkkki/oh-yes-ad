import { Prisma } from "@prisma/client";

export const computeInitiationEstimatedAgencyFee = (initiation?: unknown) => {
  if (!initiation || typeof initiation !== "object") return null;

  const source = initiation as {
    agencyFeeRate?: unknown;
    contractAmount?: unknown;
  };
  const rate = Number(source.agencyFeeRate ?? 0);
  const contractAmount = Number(source.contractAmount ?? 0);

  if (!Number.isFinite(rate) || !Number.isFinite(contractAmount)) return null;
  if (rate <= 0 || contractAmount <= 0) return null;

  return (rate / 100) * contractAmount;
};

export const initiationExtension = Prisma.defineExtension({
  name: "initiationExtension",
  result: {
    projectInitiation: {
      estimatedAgencyFee: {
        needs: { agencyFeeRate: true, contractAmount: true },
        compute(initiation) {
          return computeInitiationEstimatedAgencyFee(initiation);
        },
      },
    },
  },
});
