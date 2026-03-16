const trimStringsDeep = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(trimStringsDeep);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, trimStringsDeep(item)]),
    );
  }

  return value;
};

export const sanitizeRequestBody = async (
  req: Request,
): Promise<Awaited<ReturnType<Request["json"]>>> => {
  const body = await req.json();
  return trimStringsDeep(body) as Awaited<ReturnType<Request["json"]>>;
};
