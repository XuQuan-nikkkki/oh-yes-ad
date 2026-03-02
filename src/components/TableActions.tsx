"use client";

import { Space, Button, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteTitle?: string;
};

const TableActions = ({
  onEdit,
  onDelete,
  deleteTitle = "确定删除该记录？",
}: Props) => {
  return (
    <Space size={8}>
      {onEdit && (
        <Button
          variant="text"
          color="primary"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
        >
          编辑
        </Button>
      )}

      {onDelete && (
        <Popconfirm
          title={deleteTitle}
          okText="确认"
          cancelText="取消"
          onConfirm={(e) => {
            e?.stopPropagation?.();
            onDelete?.();
          }}
        >
          <Button
            variant="text"
            color="danger"
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          >
            删除
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
};

export default TableActions;
