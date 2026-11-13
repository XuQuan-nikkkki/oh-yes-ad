"use client";

import { useEffect, useState } from "react";
import { Empty } from "antd";
import AppLink from "@/components/AppLink";
import SelectOptionTag from "@/components/SelectOptionTag";
import type { Project } from "@/types/projectDetail";
import type { Vendor } from "@/types/vendor";
import styles from "./ProjectWorkspaceVendors.module.css";

type ProjectVendor = NonNullable<Project["vendors"]>[number];
type VendorContract = {
  vendorId: string;
  serviceContent?: string | null;
};

type Props = {
  projectId: string;
  vendors: ProjectVendor[];
};

export default function ProjectWorkspaceVendors({ projectId, vendors }: Props) {
  const [details, setDetails] = useState<Record<string, Vendor>>({});
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [loading, setLoading] = useState(false);
  const vendorIdsKey = vendors.map((vendor) => vendor.id).join(",");

  useEffect(() => {
    if (!vendorIdsKey) return;
    const controller = new AbortController();
    const vendorIds = vendorIdsKey.split(",");

    const load = async () => {
      setLoading(true);
      const [vendorResults, contractResult] = await Promise.all([
        Promise.all(vendorIds.map(async (id) => {
          try {
            const response = await fetch(`/api/vendors/${id}`, { signal: controller.signal });
            return response.ok ? (await response.json()) as Vendor : null;
          } catch {
            return null;
          }
        })),
        fetch(`/api/vendor-contracts?projectId=${encodeURIComponent(projectId)}`, { signal: controller.signal })
          .then(async (response) => response.ok ? (await response.json()) as VendorContract[] : [])
          .catch(() => [] as VendorContract[]),
      ]);

      if (controller.signal.aborted) return;
      setDetails(Object.fromEntries(vendorResults.filter((vendor): vendor is Vendor => Boolean(vendor)).map((vendor) => [vendor.id, vendor])));
      setContracts(contractResult);
      setLoading(false);
    };

    void load();
    return () => controller.abort();
  }, [projectId, vendorIdsKey]);

  return <>
    <div className={styles.heading}>
      <h2>供应商</h2>
    </div>
    {vendors.length ? <div className={styles.grid}>
      {vendors.map((vendor) => {
        const detail = details[vendor.id];
        const businessTypes = detail?.businessTypeOptions?.length
          ? detail.businessTypeOptions
          : detail?.businessTypeOption ? [detail.businessTypeOption] : [];
        const services = detail?.serviceOptions ?? [];
        const projectServices = [...new Set(contracts
          .filter((contract) => contract.vendorId === vendor.id)
          .map((contract) => contract.serviceContent?.trim())
          .filter((value): value is string => Boolean(value)))];

        return <article className={styles.card} key={vendor.id}>
          <div className={styles.cardHeader}>
            <AppLink href={`/vendors/${vendor.id}`} className={styles.name} style={{ textDecoration: "none", fontWeight: 600 }}>{vendor.name}</AppLink>
            {detail?.vendorTypeOption?.value && <SelectOptionTag field="vendor.vendorType" option={detail.vendorTypeOption} disabled />}
          </div>
          {loading && !detail ? <p className={styles.loading}>正在读取供应商信息…</p> : <>
            <div className={styles.fields}>
              <div><span>业务类型</span><div className={styles.tags}>{businessTypes.length
                ? businessTypes.map((option) => <SelectOptionTag key={option.id} field="vendor.businessType" option={option} disabled />)
                : <strong>未填写</strong>}</div></div>
              <div><span>服务范围</span><div className={styles.tags}>{services.length
                ? services.map((option) => <SelectOptionTag key={option.id} field="vendor.services" option={option} disabled />)
                : <strong>未填写</strong>}</div></div>
            </div>
            {projectServices.length > 0 && <div className={styles.projectServices}>
              <span>本项目合作内容</span>
              {projectServices.map((content) => <p key={content}>{content}</p>)}
            </div>}
          </>}
        </article>;
      })}
    </div> : <div className={styles.empty}><Empty description="暂无合作供应商" /></div>}
  </>;
}
