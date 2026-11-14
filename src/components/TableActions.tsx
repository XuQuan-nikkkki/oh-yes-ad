"use client";

import { Space, Button, Popconfirm } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  deleteDisabled?: boolean;
  editLoading?: boolean;
  deleteLoading?: boolean;
  deleteTitle?: string;
  editText?: string;
  deleteText?: string;
  disableTextVairant?: boolean;
  gap?: number;
  buttonStyle?: CSSProperties;
  showIcons?: boolean;
  middleAction?: ReactNode;
};

const TableActions = ({
  onEdit,
  onDelete,
  disabled = false,
  deleteDisabled = false,
  editLoading = false,
  deleteLoading = false,
  deleteTitle = "确定删除该记录？",
  editText = "编辑",
  deleteText = "删除",
  disableTextVairant = false,
  gap = 4,
  buttonStyle,
  showIcons = true,
  middleAction,
}: Props) => {
  return (
    <Space size={gap} wrap={false} style={{ whiteSpace: "nowrap" }}>
      {onEdit && (
        <Button
          variant={disableTextVairant ? undefined : "text"}
          color="primary"
          style={buttonStyle}
          disabled={disabled}
          loading={editLoading}
          icon={showIcons ? <EditOutlined /> : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          styles={{ root: disableTextVairant ? undefined : { padding: 6 } }}
        >
          {editText}
        </Button>
      )}

      {middleAction}

      {onDelete && (
        <Popconfirm
          title={deleteTitle}
          disabled={disabled || deleteDisabled}
          okText="确认"
          cancelText="取消"
          onConfirm={(e) => {
            e?.stopPropagation?.();
            onDelete?.();
          }}
        >
          <Button
            color="danger"
            variant={disableTextVairant ? undefined : "text"}
            danger
            style={buttonStyle}
            disabled={disabled || deleteDisabled}
            loading={deleteLoading}
            icon={showIcons ? <DeleteOutlined /> : undefined}
            onClick={(e) => e.stopPropagation()}
            styles={{ root: disableTextVairant ? undefined : { padding: 8 } }}
          >
            {deleteText}
          </Button>
        </Popconfirm>
      )}
    </Space>
  );
};

export default TableActions;
