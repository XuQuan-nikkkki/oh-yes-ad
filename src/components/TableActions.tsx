"use client";

import { Space, Button, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  editLoading?: boolean;
  deleteLoading?: boolean;
  deleteTitle?: string;
  editText?: string;
  deleteText?: string;
};

const TableActions = ({
  onEdit,
  onDelete,
  disabled = false,
  editLoading = false,
  deleteLoading = false,
  deleteTitle = "确定删除该记录？",
  editText = "编辑",
  deleteText = "删除",
}: Props) => {
  return (
    <Space size={8} wrap={false} style={{ whiteSpace: "nowrap" }}>
      {onEdit && (
        <Button
          variant="text"
          color="primary"
          disabled={disabled}
          loading={editLoading}
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
        >
          {editText}
        </Button>
      )}

      {onDelete && (
        <Popconfirm
          title={deleteTitle}
          disabled={disabled}
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
            disabled={disabled}
            loading={deleteLoading}
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          >
            {deleteText}
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
};

export default TableActions;
