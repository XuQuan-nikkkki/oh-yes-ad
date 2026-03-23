type ClientLinkRecord = {
  order?: number | null;
  client?: {
    id: string;
    name: string;
  } | null;
};

type ClientContactRecord = {
  id: string;
  name: string;
  title?: string | null;
  scope?: string | null;
  preference?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  clientLinks?: ClientLinkRecord[];
};

export const serializeClientContact = <T extends ClientContactRecord>(
  contact: T,
) => {
  const clients = (contact.clientLinks ?? [])
    .map((link) => ({
      order: link.order ?? Number.MAX_SAFE_INTEGER,
      client: link.client ?? null,
    }))
    .filter(
      (
        item,
      ): item is {
        order: number;
        client: { id: string; name: string };
      } => Boolean(item.client?.id && item.client?.name),
    )
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      return left.client.name.localeCompare(right.client.name, "zh-CN");
    })
    .map((item) => item.client);

  return {
    ...contact,
    order: contact.clientLinks?.[0]?.order ?? undefined,
    clientIds: clients.map((client) => client.id),
    client: clients[0] ?? null,
    clients,
  };
};
