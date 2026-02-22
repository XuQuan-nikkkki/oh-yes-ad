"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  industry: string;
  remark?: string | null;
  createdAt: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error("加载失败", err);
    } finally {
      setLoading(false);
    }
  }

  async function addClient() {
    setLoading(true);
    try {
      await fetch("/api/clients", {
        method: "POST",
      });
      await fetchClients();
    } catch (err) {
      console.error("新增失败", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Client Management</h1>

      <button onClick={addClient} disabled={loading}>
        {loading ? "处理中..." : "新增测试客户"}
      </button>

      <table style={{ marginTop: 20, width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">名称</th>
            <th align="left">行业</th>
            <th align="left">备注</th>
            <th align="left">创建时间</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.industry}</td>
              <td>{client.remark ?? "-"}</td>
              <td>
                {new Date(client.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}