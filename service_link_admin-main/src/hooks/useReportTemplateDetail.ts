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
}: UseReportTemplateDetailArgs) {
  const [items, setItems] = useState<any[]>(() => initializeItems(data?.items));
  const [file, setFile] = useState(data?.fileUrl ?? '');
  const [fileList, setFileList] = useState<any[]>(
    data?.fileUrl ? buildFileListFromUrl(data.fileUrl) : [],
  );
  const hydratedSignatureRef = useRef<string | null>(null);
  const templateId = data?.id ? Number(data.id) : NaN;
  const isEdit = modalType === actionType.UPDATE || modalType === actionType.VIEW;

  useEffect(() => {
    hydratedSignatureRef.current = null;
    setItems([]);
    setFile('');
    setFileList([]);
  }, [templateId, modalType]);

  useEffect(() => {
    if (!isEdit || !Number.isFinite(templateId)) {
      if (modalType === actionType.ADD) {
        form.setFieldsValue({ category: DEFAULT_CATEGORY, assignedStaffId: null, serviceIds: [] });
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
    const deptKey = Array.isArray(rawDeptIds) ? rawDeptIds.join(',') : '';
    const hydrationSignature = `${templateId}:${data?.updatedAt ?? ''}:${deptKey}`;
    if (hydratedSignatureRef.current === hydrationSignature) {
      return;
    }

    const loadedCategory = (data.category ?? '').trim() || DEFAULT_CATEGORY;
    const rawAssigned = data.assignedStaffId ?? data.assigned_staff_id;
    const serviceIds = Array.isArray(rawDeptIds)
      ? rawDeptIds.map((v: unknown) => +v).filter((n: number) => Number.isFinite(n) && n > 0)
      : [];
    form.setFieldsValue({
      name: data.name ?? '',
      description: data.description ?? '',
      category: loadedCategory,
      assignedStaffId: rawAssigned != null ? +rawAssigned : null,
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
  ]);

  const resetEditor = () => {
    hydratedSignatureRef.current = null;
    setItems([]);
    setFile('');
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({ category: DEFAULT_CATEGORY, assignedStaffId: null, serviceIds: [] });
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
