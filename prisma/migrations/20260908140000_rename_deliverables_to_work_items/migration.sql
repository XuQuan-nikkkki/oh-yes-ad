-- 原地改名，不重建业务表；历史迁移继续使用旧命名。本块可重复执行。
DO $migration$
DECLARE
  item record;
  next_name text;
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM pg_advisory_xact_lock(hashtext('rename-deliverables-to-work-items'));

  FOR item IN SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'Deliverable%'
    ORDER BY tablename
  LOOP
    IF item.tablename NOT IN (
      'Deliverable', 'DeliverableFormatOption', 'DeliverableCategoryOrSceneOption',
      'DeliverableAssignmentChange', 'DeliverableSubmission', 'DeliverableSubmissionResource',
      'DeliverableFeedback', 'DeliverableFeedbackImage', 'DeliverableAdjustmentItem',
      'DeliverableAdjustmentItemImage', 'DeliverableAdjustmentCheck'
    ) THEN
      RAISE EXCEPTION '未知旧表，请先核对前置迁移：%', item.tablename;
    END IF;
    next_name := replace(item.tablename, 'Deliverable', 'WorkItem');
    IF to_regclass(format('public.%I', next_name)) IS NOT NULL THEN
      RAISE EXCEPTION '新旧表同时存在，停止迁移：% / %', item.tablename, next_name;
    END IF;
    EXECUTE format('ALTER TABLE public.%I RENAME TO %I', item.tablename, next_name);
  END LOOP;

  FOR item IN SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'deliverableId'
  LOOP
    IF item.table_name NOT IN ('WorkItemFormatOption', 'WorkItemCategoryOrSceneOption',
      'WorkItemAssignmentChange', 'WorkItemSubmission', 'PlannedWorkEntry') THEN
      RAISE EXCEPTION '未知旧关联列：%.deliverableId', item.table_name;
    END IF;
    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN "deliverableId" TO "workItemId"', item.table_name);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'DeliverableSubmissionResourceKind') THEN
    ALTER TYPE public."DeliverableSubmissionResourceKind" RENAME TO "WorkItemSubmissionResourceKind";
  END IF;

  -- PostgreSQL 会跟随表/列改名保留约束定义，但约束及索引名称需要显式修改。
  FOR item IN SELECT c.conname, t.relname FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND c.conname ~ '[Dd]eliverable'
      AND (t.relname LIKE 'WorkItem%' OR t.relname = 'PlannedWorkEntry')
  LOOP
    next_name := replace(replace(replace(item.conname,
      'Deliverable', 'WorkItem'), 'deliverableId', 'workItemId'), 'deliverable', 'work_item');
    EXECUTE format('ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I', item.relname, item.conname, next_name);
  END LOOP;

  FOR item IN SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND indexname ~ '[Dd]eliverable'
      AND (tablename LIKE 'WorkItem%' OR tablename = 'PlannedWorkEntry')
  LOOP
    next_name := replace(replace(replace(item.indexname,
      'Deliverable', 'WorkItem'), 'deliverableId', 'workItemId'), 'deliverable', 'work_item');
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I', item.indexname, next_name);
  END LOOP;

  IF to_regclass('public."SelectOption"') IS NOT NULL THEN
    UPDATE public."SelectOption" SET field = replace(field, 'briefDeliverable.', 'briefWorkItem.')
      WHERE field IN ('briefDeliverable.format', 'briefDeliverable.categoryOrScene');
  END IF;
END
$migration$;
