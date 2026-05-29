const shouldParseOptions = (type?: string) => {
  if (!type) return false;
  return ['SELECT', 'CHECKLIST'].includes(type);
};

export const parseOptionsFromItem = (item: any) => {
  if (!item) return [];
  if (Array.isArray(item.options) && item.options.length) {
    return item.options;
  }
  if (Array.isArray(item?.config?.options) && item.config.options.length) {
    return item.config.options;
  }
  if (typeof item.value === 'string' && shouldParseOptions(item.type)) {
    return item.value.split(/[|,]/).map((option: string) => option.trim()).filter(Boolean);
  }
  return [];
};

export const transformItemFromServer = (item: any) => {
  if (!item) return item;
  const config = item.config || {};
  return {
    ...item,
    label: config.label ?? item.label ?? item.name,
    required:
      typeof item.required === 'boolean'
        ? item.required
        : typeof config.required === 'boolean'
          ? config.required
          : false,
    options: parseOptionsFromItem(item),
    defaultValue: config.defaultValue ?? item.defaultValue,
    placeholder: config.placeholder ?? item.placeholder,
    validation: config.validation ?? item.validation,
    config: { ...config },
  };
};

export const initializeItems = (records?: any[]) => {
  if (!Array.isArray(records) || !records.length) {
    return [];
  }
  return records.map(transformItemFromServer);
};

export const sanitizeFileUrlForSubmit = (raw?: string) => {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) {
    return value;
  }
  return '';
};

export const normalizeItemsForSubmit = (items: any[]) => {
  return items.map((item, index) => {
    const order = Math.max(
      1,
      Math.floor(Number(typeof item.order === 'number' ? item.order : index + 1)),
    );
    const sanitized: Record<string, unknown> = {
      name: String(item.name ?? '').trim() || `Item ${index + 1}`,
      type: item.type,
      value: item.value != null ? String(item.value) : '',
      order,
      required: Boolean(item.required),
    };
    if (item.label) sanitized.label = String(item.label);
    if (Array.isArray(item.options) && item.options.length) {
      sanitized.options = item.options.map((o: string) => String(o));
    }
    if (
      item.defaultValue !== undefined &&
      item.defaultValue !== null &&
      String(item.defaultValue).trim() !== ''
    ) {
      sanitized.defaultValue = String(item.defaultValue);
    }
    if (item.placeholder) sanitized.placeholder = String(item.placeholder);
    if (item.validation && typeof item.validation === 'object' && !Array.isArray(item.validation)) {
      sanitized.validation = item.validation;
    }
    if (item.config && typeof item.config === 'object' && !Array.isArray(item.config)) {
      try {
        const config = JSON.parse(JSON.stringify(item.config));
        if (config && Object.keys(config).length) {
          sanitized.config = config;
        }
      } catch {
        // skip invalid config
      }
    }
    return sanitized;
  });
};

/** Split save payload: metadata PATCH vs items PUT */
export const buildReportTemplateSaveBodies = (
  data: Record<string, unknown>,
  options: { isEdit: boolean; includeItems: boolean },
) => {
  const meta: Record<string, unknown> = {};
  if (data.name !== undefined) meta.name = data.name;
  if (data.description !== undefined && data.description !== null) {
    meta.description = data.description;
  }
  if (data.category !== undefined && String(data.category).trim() !== '') {
    meta.category = String(data.category).trim();
  }
  if (data.fileUrl !== undefined) meta.fileUrl = data.fileUrl;
  if (data.order !== undefined) meta.order = data.order;
  if (data.settings !== undefined) meta.settings = data.settings;
  if (data.status !== undefined) meta.status = data.status;
  if (data.assignedStaffId !== undefined) {
    meta.assignedStaffId = data.assignedStaffId;
  }
  if (data.serviceIds !== undefined) {
    meta.serviceIds = Array.isArray(data.serviceIds)
      ? data.serviceIds
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];
  }

  const items =
    options.includeItems && Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : undefined;

  if (!options.isEdit && items) {
    return { meta: { ...meta, items }, items: undefined as undefined };
  }

  return { meta, items };
};
