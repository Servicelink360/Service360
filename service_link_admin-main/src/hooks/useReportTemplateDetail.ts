import { useEffect, useRef, useState } from 'react';
import { FormInstance } from 'antd';
import actionType from '@app/constants/actionType';
import { initializeItems } from '@app/lib/report-templates/templateItemUtils';

const DEFAULT_CATEGORY = 'GENERAL';

type UseReportTemplateDetailArgs = {
  modalType: string;
  data: any;
  loadingDetail?: boolean;
  form: FormInstance;
  ensureCategoryChoice: (value?: string, label?: string) => void;
  formatCategoryLabel: (value: string) => string;
  buildFileListFromUrl: (url: string) => any[];
  /** Override default category when creating a new template (e.g. SAFETY_AUDIT). */
  defaultCategory?: string;
};

/**
 * Single hydration path: Redux GET_INFO ? data prop.
 * No duplicate GET in the modal.
 */
export function useReportTemplateDetail({
  modalType,
  data,
  loadingDetail = false,
  form,
  ensureCategoryChoice,
  formatCategoryLabel,
  buildFileListFromUrl,
  defaultCategory,
}: UseReportTemplateDetailArgs) {
  const [items, setItems] = useState<any[]>(() => initializeItems(data?.items));
  const [file, setFile] = useState(data?.fileUrl ?? '');
  const [fileList, setFileList] = useState<any[]>(
    data?.fileUrl ? buildFileListFromUrl(data.fileUrl) : [],
  );
  const hydratedSignatureRef = useRef<string | null>(null);
  const templateId = data?.id ? Number(data.id) : NaN;
  const isEdit = modalType === actionType.UPDATE || modalType === actionType.VIEW;
  const addCategory =
    (defaultCategory || data?.category || DEFAULT_CATEGORY).trim() || DEFAULT_CATEGORY;

  useEffect(() => {
    hydratedSignatureRef.current = null;
    setItems([]);
    setFile('');
    setFileList([]);
  }, [templateId, modalType]);

  useEffect(() => {
    if (!isEdit || !Number.isFinite(templateId)) {
      if (modalType === actionType.ADD) {
        form.setFieldsValue({ category: addCategory, assignedStaffIds: [], serviceIds: [] });
        ensureCategoryChoice(addCategory, formatCategoryLabel(addCategory));
      }
      return;
    }

    if (loadingDetail) {
      return;
    }

    if (Number(data?.id) !== templateId) {
      return;
    }

    const rawDeptIds = data.serviceIds ?? data.service_ids;
    const rawStaffIds = data.assignedStaffIds ?? data.assigned_staff_ids;
    const deptKey = Array.isArray(rawDeptIds) ? rawDeptIds.join(',') : '';
    const staffKey = Array.isArray(rawStaffIds)
      ? rawStaffIds.join(',')
      : String(data.assignedStaffId ?? data.assigned_staff_id ?? '');
    const hydrationSignature = `${templateId}:${data?.updatedAt ?? ''}:${deptKey}:${staffKey}`;
    if (hydratedSignatureRef.current === hydrationSignature) {
      return;
    }

    const loadedCategory = (data.category ?? '').trim() || DEFAULT_CATEGORY;
    const serviceIds = Array.isArray(rawDeptIds)
      ? rawDeptIds.map((v: unknown) => +v).filter((n: number) => Number.isFinite(n) && n > 0)
      : [];

    // Lazy import avoided — mirror assignedStaffIdsFromTemplate inline to keep hook free of cycles
    let assignedStaffIds: number[] = [];
    if (Array.isArray(rawStaffIds) && rawStaffIds.length) {
      const cleaned = rawStaffIds.map((v: unknown) => +v).filter((n: number) => Number.isFinite(n) && n >= 0);
      assignedStaffIds = cleaned.includes(0) ? [0] : [...new Set(cleaned.filter((n) => n > 0))];
    } else {
      const rawAssigned = data.assignedStaffId ?? data.assigned_staff_id;
      if (rawAssigned != null && rawAssigned !== '') {
        const n = +rawAssigned;
        if (n === 0) assignedStaffIds = [0];
        else if (n > 0) assignedStaffIds = [n];
      }
    }

    form.setFieldsValue({
      name: data.name ?? '',
      description: data.description ?? '',
      category: loadedCategory,
      assignedStaffIds,
      serviceIds,
    });
    ensureCategoryChoice(loadedCategory, formatCategoryLabel(loadedCategory));

    setItems(initializeItems(data.items));
    const nextFileUrl = data.fileUrl ?? '';
    if (nextFileUrl) {
      setFileList(buildFileListFromUrl(nextFileUrl));
      setFile(nextFileUrl);
    } else {
      setFileList([]);
      setFile('');
    }

    hydratedSignatureRef.current = hydrationSignature;
  }, [
    isEdit,
    templateId,
    loadingDetail,
    data,
    modalType,
    form,
    ensureCategoryChoice,
    formatCategoryLabel,
    buildFileListFromUrl,
    addCategory,
  ]);

  const resetEditor = () => {
    hydratedSignatureRef.current = null;
    setItems([]);
    setFile('');
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({ category: addCategory, assignedStaffIds: [], serviceIds: [] });
  };

  return {
    items,
    setItems,
    file,
    setFile,
    fileList,
    setFileList,
    loadingDetail: isEdit && loadingDetail,
    resetEditor,
    templateId,
    isEdit,
  };
}
