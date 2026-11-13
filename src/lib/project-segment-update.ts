type ProjectSegmentPatchBody = Record<string, unknown>;

export type ProjectSegmentScalarUpdate = {
  name?: string;
  projectId?: string;
  statusOptionId?: string | null;
  ownerId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
};

const hasOwn = (body: ProjectSegmentPatchBody, key: string) =>
  Object.prototype.hasOwnProperty.call(body, key);

const nullableDate = (value: unknown) =>
  typeof value === "string" && value ? new Date(value) : null;

/** Build PATCH data without turning omitted fields into explicit nulls. */
export const buildProjectSegmentScalarUpdate = (
  body: ProjectSegmentPatchBody,
): ProjectSegmentScalarUpdate => {
  const data: ProjectSegmentScalarUpdate = {};

  if (hasOwn(body, "name")) data.name = body.name as string;
  if (hasOwn(body, "projectId")) data.projectId = body.projectId as string;
  if (hasOwn(body, "ownerId")) {
    data.ownerId = typeof body.ownerId === "string" && body.ownerId ? body.ownerId : null;
  }
  if (hasOwn(body, "startDate")) data.startDate = nullableDate(body.startDate);

  if (hasOwn(body, "endDate")) {
    data.endDate = nullableDate(body.endDate);
  } else if (hasOwn(body, "dueDate")) {
    data.endDate = nullableDate(body.dueDate);
  }

  return data;
};

export const hasProjectSegmentStatusUpdate = (body: ProjectSegmentPatchBody) =>
  hasOwn(body, "status");
