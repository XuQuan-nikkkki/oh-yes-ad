"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  ColorPicker,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { DragSortTable, type ProColumns } from "@ant-design/pro-components";
import { DEFAULT_COLOR } from "@/lib/constants";
import {
  useSelectOptionsStore,
  type SelectOption,
} from "@/stores/selectOptionsStore";
import type { NullableSelectOptionValue } from "@/types/selectOption";

type NoticeState =
  | { type: "success"; content: string }
  | { type: "error"; content: string }
  | null;

type EditableOptionRow = {
  id: string;
  sort: string;
  value: string;
  color: string;
  order: number;
  createdAt?: string;
  isNew?: boolean;
};

type SortableOptionRow = {
  id: string;
  value: string;
  color?: string | null;
  order?: number | null;
  createdAt?: string;
};

type OptionSortMode = "default" | "numeric";

type Props = {
  field: string;
  option?: NullableSelectOptionValue;
  disabled?: boolean;
  fallbackText?: string;
  tagText?: string;
  tagColor?: string | null;
  modalTitle?: string;
  modalDescription?: string;
  emptyText?: string;
  addButtonText?: string;
  saveSuccessText?: string;
  optionValueLabel?: string;
  optionSortMode?: OptionSortMode;
  onSaveSelection?: (option: {
    id: string;
    value: string;
    color: string;
  }) => Promise<void> | void;
  onUpdated?: () => Promise<void> | void;
};

const normalizeHexColor = (raw?: string | null) => {
  if (!raw) return DEFAULT_COLOR;
  const color = raw.trim();
  if (!color) return DEFAULT_COLOR;
  if (/^#([0-9a-fA-F]{8})$/.test(color)) {
    return color.slice(0, 7);
  }
  return color.startsWith("#") ? color : `#${color}`;
};

const compareOptionValues = (leftValue: string, rightValue: string) =>
  leftValue.localeCompare(rightValue, "zh-CN");

const compareOptionValuesAsNumbers = (
  leftValue: string,
  rightValue: string,
) => {
  const leftNumber = Number(leftValue.trim());
  const rightNumber = Number(rightValue.trim());
  const leftIsNumeric = Number.isFinite(leftNumber);
  const rightIsNumeric = Number.isFinite(rightNumber);

  if (leftIsNumeric && rightIsNumeric) return leftNumber - rightNumber;
  if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1;
  return compareOptionValues(leftValue, rightValue);
};

const sortByOrder = (
  left: SortableOptionRow,
  right: SortableOptionRow,
  optionSortMode: OptionSortMode,
) => {
  if (optionSortMode === "numeric") {
    const valueCompare = compareOptionValuesAsNumbers(left.value, right.value);
    if (valueCompare !== 0) return valueCompare;
  }
  const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return compareOptionValues(left.value, right.value);
};

const toEditableRows = (
  options: SortableOptionRow[],
  optionSortMode: OptionSortMode,
) =>
  [...options]
    .sort((left, right) => sortByOrder(left, right, optionSortMode))
    .map((item, index) => ({
      id: item.id,
      sort: item.id,
      value: item.value,
      color: normalizeHexColor(item.color),
      order: index + 1,
      createdAt: item.createdAt,
    }));

const toComparableRows = (rows: EditableOptionRow[]) =>
  rows.map((row, index) => ({
    id: row.id,
    value: row.value.trim(),
    color: normalizeHexColor(row.color),
    order: index + 1,
    isNew: Boolean(row.isNew),
  }));

const hasOptionChanges = (
  originalRows: EditableOptionRow[],
  nextRows: EditableOptionRow[],
  deletedRowIds: string[],
) => {
  if (deletedRowIds.length > 0) return true;

  const comparableOriginalRows = toComparableRows(originalRows);
  const comparableNextRows = toComparableRows(nextRows);

  if (comparableOriginalRows.length !== comparableNextRows.length) return true;

  return comparableNextRows.some((row, index) => {
    const original = comparableOriginalRows[index];
    if (!original) return true;
    return (
      row.id !== original.id ||
      row.value !== original.value ||
      row.color !== original.color ||
      row.order !== original.order ||
      row.isNew !== original.isNew
    );
  });
};

type InlineColorPickerEditorProps = {
  appliedColor: string;
  disabled: boolean;
  onConfirm: (nextColor: string) => void;
};

const InlineColorPickerEditor = ({
  appliedColor,
  disabled,
  onConfirm,
}: InlineColorPickerEditorProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftColor, setDraftColor] = useState(appliedColor);

  useEffect(() => {
    if (pickerOpen) return;
    setDraftColor(appliedColor);
  }, [appliedColor, pickerOpen]);

  return (
    <Space>
      <Tag
        color={draftColor}
        style={{
          minWidth: 96,
          textAlign: "center",
          marginInlineEnd: 0,
        }}
      >
        {draftColor}
      </Tag>
      <ColorPicker
        value={draftColor}
        format="hex"
        disabledAlpha
        disabled={disabled}
        open={pickerOpen}
        onOpenChange={(nextOpen) => {
          setPickerOpen(nextOpen);
          if (nextOpen) {
            setDraftColor(appliedColor);
          }
        }}
        onChange={(color) => {
          setDraftColor(normalizeHexColor(color.toHexString()));
        }}
        panelRender={(panel) => (
          <div>
            {panel}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                paddingTop: 8,
              }}
            >
              <Button
                size="small"
                onClick={() => {
                  setDraftColor(appliedColor);
                  setPickerOpen(false);
                }}
              >
                取消
              </Button>
              <Button
                size="small"
                type="primary"
                disabled={disabled || draftColor === appliedColor}
                onClick={() => {
                  onConfirm(draftColor);
                  setPickerOpen(false);
                }}
              >
                确认
              </Button>
            </div>
          </div>
        )}
      />
    </Space>
  );
};

const SelectOptionQuickEditTag = ({
  field,
  option,
  disabled = false,
  fallbackText = "-",
  tagText,
  tagColor,
  modalTitle = "修改选项",
  modalDescription,
  emptyText = "暂无选项",
  addButtonText = "新增选项",
  saveSuccessText = "选项已保存",
  optionValueLabel = "选项值",
  optionSortMode = "default",
  onSaveSelection,
  onUpdated,
}: Props) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [savingOptions, setSavingOptions] = useState(false);
  const [updatingSelection, setUpdatingSelection] = useState(false);
  const [rows, setRows] = useState<EditableOptionRow[]>([]);
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);
  const [pendingSelectedId, setPendingSelectedId] = useState<string | null>(
    option?.id ?? null,
  );
  const [notice, setNotice] = useState<NoticeState>(null);
  const rowsRef = useRef<EditableOptionRow[]>([]);
  const initialRowsRef = useRef<EditableOptionRow[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fetchAllOptions = useSelectOptionsStore(
    (state) => state.fetchAllOptions,
  );
  const optionsByField = useSelectOptionsStore((state) => state.optionsByField);
  const storeLoading = useSelectOptionsStore((state) => state.loading);
  const selectionEnabled = Boolean(onSaveSelection);

  useEffect(() => {
    if (!open) return;
    void fetchAllOptions(true);
  }, [open, fetchAllOptions]);

  const selectOptions = useMemo(
    () => optionsByField[field] ?? [],
    [field, optionsByField],
  );
  const normalizedOptionValue =
    typeof option?.value === "string" ? option.value.trim() : "";
  const liveOption = useMemo(
    () => {
      if (option?.id) {
        const byId = selectOptions.find((item) => item.id === option.id) ?? null;
        if (byId) return byId;
      }
      if (normalizedOptionValue) {
        return (
          selectOptions.find(
            (item) => (item.value ?? "").trim() === normalizedOptionValue,
          ) ?? null
        );
      }
      return null;
    },
    [normalizedOptionValue, option?.id, selectOptions],
  );
  const resolvedTagColor = normalizeHexColor(
    tagColor ?? liveOption?.color ?? option?.color,
  );
  const resolvedTagText =
    tagText ?? liveOption?.value ?? option?.value ?? fallbackText;

  useEffect(() => {
    if (!open) return;
    const nextRows = toEditableRows(selectOptions, optionSortMode);
    setRows(nextRows);
    initialRowsRef.current = nextRows;
    setDeletedRowIds([]);
    setPendingSelectedId(option?.id ?? null);
  }, [open, option?.id, optionSortMode, selectOptions]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    if (!notice) return;
    if (notice.type === "success") {
      messageApi.success(notice.content);
    } else {
      messageApi.error(notice.content);
    }
    setNotice(null);
  }, [messageApi, notice]);

  const updateRowsRef = useCallback(
    (
      rowId: string,
      patch: Partial<Pick<EditableOptionRow, "value" | "color">>,
    ) => {
      rowsRef.current = rowsRef.current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...patch,
            }
          : row,
      );
    },
    [],
  );

  const handleRowChange = useCallback(
    (
      rowId: string,
      patch: Partial<Pick<EditableOptionRow, "value" | "color">>,
      syncState = false,
    ) => {
      setRows((current) =>
        current.map((row) =>
          row.id === rowId
            ? {
                ...row,
                ...patch,
              }
            : row,
        ),
      );
      if (!syncState) return;
      updateRowsRef(rowId, patch);
    },
    [updateRowsRef],
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      const targetRow = rowsRef.current.find((row) => row.id === rowId);
      if (!targetRow) return;

      rowsRef.current = rowsRef.current.filter((row) => row.id !== rowId);
      setRows((current) => current.filter((row) => row.id !== rowId));

      if (!targetRow.isNew) {
        setDeletedRowIds((current) =>
          current.includes(rowId) ? current : [...current, rowId],
        );
      }

      setPendingSelectedId((current) => {
        if (current !== rowId) return current;
        return option?.id === rowId
          ? (option?.id ?? null)
          : (option?.id ?? null);
      });
    },
    [option?.id],
  );

  const persistOptions = useCallback(
    async (sourceRows?: EditableOptionRow[]) => {
      const workingRows = sourceRows ?? rowsRef.current;
      const normalizedRows = workingRows.map((row, index) => ({
        ...row,
        value: row.value.trim(),
        color: normalizeHexColor(row.color),
        order: index + 1,
      }));

      if (normalizedRows.some((row) => !row.value)) {
        throw new Error("选项文案不能为空");
      }

      const duplicatedValue = normalizedRows.find(
        (row, index) =>
          normalizedRows.findIndex((item) => item.value === row.value) !==
          index,
      );
      if (duplicatedValue) {
        throw new Error(`选项「${duplicatedValue.value}」重复`);
      }

      if (
        !hasOptionChanges(initialRowsRef.current, normalizedRows, deletedRowIds)
      ) {
        const stableRows = normalizedRows.map((row) => ({
          id: row.id,
          sort: row.id,
          value: row.value,
          color: row.color,
          order: row.order,
          createdAt: row.createdAt,
          isNew: row.isNew,
        }));
        return {
          rows: stableRows,
          changed: false,
        };
      }

      setSavingOptions(true);
      try {
        for (const rowId of deletedRowIds) {
          const response = await fetch(`/api/select-options/${rowId}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            throw new Error((await response.text()) || "删除选项失败");
          }
        }

        const persistedRows: EditableOptionRow[] = [];

        for (const row of normalizedRows) {
          const payload = {
            field,
            value: row.value,
            color: row.color,
            order: row.order,
          };

          const response = row.isNew
            ? await fetch("/api/select-options", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              })
            : await fetch(`/api/select-options/${row.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });

          if (!response.ok) {
            throw new Error((await response.text()) || "保存选项失败");
          }

          const saved = (await response.json()) as SelectOption;
          persistedRows.push({
            id: saved.id,
            sort: saved.id,
            value: saved.value,
            color: normalizeHexColor(saved.color),
            order: saved.order ?? row.order,
            createdAt: saved.createdAt,
          });
        }

        const nextRows = toEditableRows(persistedRows, optionSortMode);
        setRows(nextRows);
        initialRowsRef.current = nextRows;
        setDeletedRowIds([]);
        await fetchAllOptions(true);
        return {
          rows: persistedRows,
          changed: true,
        };
      } finally {
        setSavingOptions(false);
      }
    },
    [deletedRowIds, fetchAllOptions, field, optionSortMode],
  );

  const handleSave = async () => {
    try {
      const currentRows = rowsRef.current;
      const { rows: persistedRows, changed: optionsChanged } =
        await persistOptions(currentRows);
      const selectedRow =
        (pendingSelectedId
          ? persistedRows.find((row) => row.id === pendingSelectedId)
          : null) ??
        (pendingSelectedId
          ? persistedRows.find((row) => {
              const draftRow = currentRows.find(
                (item) => item.id === pendingSelectedId,
              );
              return draftRow ? row.value === draftRow.value.trim() : false;
            })
          : null);

      if (selectionEnabled && selectedRow && selectedRow.id !== option?.id) {
        setUpdatingSelection(true);
        await onSaveSelection?.({
          id: selectedRow.id,
          value: selectedRow.value,
          color: selectedRow.color,
        });
      }

      setNotice({ type: "success", content: saveSuccessText });
      setOpen(false);
      if (
        optionsChanged ||
        (selectionEnabled && selectedRow && selectedRow.id !== option?.id)
      ) {
        await onUpdated?.();
      }
    } catch (error) {
      setNotice({
        type: "error",
        content: error instanceof Error ? error.message : "保存失败",
      });
    } finally {
      setUpdatingSelection(false);
    }
  };

  const columns = useMemo<ProColumns<EditableOptionRow>[]>(
    () => [
      {
        title: "",
        dataIndex: "sort",
        width: 40,
        className: "drag-visible",
      },
      ...(selectionEnabled
        ? [
            {
              title: "当前",
              dataIndex: "checked",
              width: 56,
              render: (_value: unknown, record: EditableOptionRow) => (
                <Checkbox
                  checked={record.id === pendingSelectedId}
                  disabled={
                    disabled ||
                    savingOptions ||
                    updatingSelection ||
                    !record.value.trim()
                  }
                  onChange={(event) => {
                    if (!event.target.checked) return;
                    setPendingSelectedId(record.id);
                  }}
                />
              ),
            } satisfies ProColumns<EditableOptionRow>,
          ]
        : []),
      {
        title: optionValueLabel,
        dataIndex: "value",
        render: (_value, record) => (
          <Input
            defaultValue={record.value}
            placeholder={`请输入${optionValueLabel}`}
            disabled={savingOptions || updatingSelection}
            onChange={(event) => {
              updateRowsRef(record.id, { value: event.target.value });
            }}
            onBlur={(event) => {
              handleRowChange(record.id, { value: event.target.value }, true);
            }}
          />
        ),
      },
      {
        title: "颜色",
        dataIndex: "color",
        width: 220,
        render: (_value, record) => {
          const appliedColor = normalizeHexColor(record.color);
          return (
            <InlineColorPickerEditor
              appliedColor={appliedColor}
              disabled={savingOptions || updatingSelection}
              onConfirm={(nextColor) => {
                handleRowChange(record.id, { color: nextColor }, true);
              }}
            />
          );
        },
      },
      {
        title: "操作",
        dataIndex: "actions",
        width: 80,
        render: (_value, record) => (
          <Button
            type="link"
            danger
            size="small"
            disabled={savingOptions || updatingSelection}
            style={{ paddingInline: 0 }}
            onClick={() => {
              const confirmed = window.confirm("确定删除该选项？");
              if (!confirmed) return;
              handleDeleteRow(record.id);
            }}
          >
            删除
          </Button>
        ),
      },
    ],
    [
      disabled,
      handleDeleteRow,
      handleRowChange,
      optionValueLabel,
      pendingSelectedId,
      savingOptions,
      selectionEnabled,
      updateRowsRef,
      updatingSelection,
    ],
  );

  return (
    <>
      {contextHolder}
      <span
        style={{ cursor: disabled ? "default" : "pointer" }}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
        }}
      >
        <Tag
          color={resolvedTagColor}
          style={{
            borderRadius: 6,
            padding: "2px 10px",
            fontWeight: 500,
            cursor: disabled ? "default" : "pointer",
            marginInlineEnd: 0,
          }}
        >
          {resolvedTagText}
        </Tag>
      </span>

      <Modal
        title={modalTitle}
        open={open}
        onCancel={() => {
          if (savingOptions || updatingSelection) return;
          setOpen(false);
        }}
        destroyOnHidden
        width={760}
        footer={[
          <Button
            key="add"
            onClick={() => {
              const nextId = `new-${Date.now()}-${rowsRef.current.length}`;
              const nextRow = {
                id: nextId,
                sort: nextId,
                value: "",
                color: DEFAULT_COLOR,
                order: rowsRef.current.length + 1,
                isNew: true,
              };
              rowsRef.current = [...rowsRef.current, nextRow];
              setRows((current) => [...current, nextRow]);
              requestAnimationFrame(() => {
                const container = scrollContainerRef.current;
                if (!container) return;
                container.scrollTo({
                  top: container.scrollHeight,
                  behavior: "smooth",
                });
              });
            }}
            disabled={savingOptions || updatingSelection}
          >
            {addButtonText}
          </Button>,
          <Button
            key="cancel"
            onClick={() => setOpen(false)}
            disabled={savingOptions || updatingSelection}
          >
            关闭
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={savingOptions}
            disabled={updatingSelection}
            onClick={() => {
              void handleSave();
            }}
          >
            保存
          </Button>,
        ]}
      >
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          {modalDescription ? (
            <Typography.Text type="secondary">
              {modalDescription}
            </Typography.Text>
          ) : null}

          <div
            ref={scrollContainerRef}
            style={{
              maxHeight: "min(70vh, 960px)",
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <DragSortTable<EditableOptionRow>
              rowKey="id"
              size="small"
              search={false}
              options={false}
              pagination={false}
              dragSortKey="sort"
              columns={columns}
              dataSource={rows}
              loading={storeLoading || savingOptions || updatingSelection}
              onDragSortEnd={(
                _beforeIndex: number,
                _afterIndex: number,
                newDataSource: EditableOptionRow[],
              ) => {
                const nextRows = newDataSource.map((item, index) => ({
                  ...item,
                  order: index + 1,
                }));
                rowsRef.current = nextRows;
                setRows(nextRows);
              }}
              locale={{ emptyText }}
            />
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default SelectOptionQuickEditTag;
