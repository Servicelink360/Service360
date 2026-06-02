/** Strip UI-only fields before PATCH/POST site (customerId = company id from dropdown). */
export function serializeSiteItemsForApi(items: any[] = []) {
  return items.map((row) => ({
    serviceId: +(row.serviceId ?? row.service?.id),
    customerId:
      row.companyId ??
      row.customerId ??
      row.customer?.customerInfo?.companyId ??
      row.customer?.customerInfo?.company_id,
    companyId: row.companyId ?? row.customer?.customerInfo?.companyId,
    frequencyTimes:
      row.frequencyPeriod == null || row.frequencyPeriod === '' || row.frequencyPeriod === 'na'
        ? null
        : row.frequencyTimes ?? null,
    frequencyCount:
      row.frequencyPeriod == null || row.frequencyPeriod === '' || row.frequencyPeriod === 'na'
        ? null
        : row.frequencyCount ?? null,
    frequencyPeriod:
      row.frequencyPeriod == null || row.frequencyPeriod === '' || row.frequencyPeriod === 'na'
        ? null
        : row.frequencyPeriod,
    staffs: (row.staffs || []).map((s: any) => ({
      staffId: s.staffId ?? s.staff?.id,
      staffShifts: (s.staffShifts || []).map((sh: any) => ({
        startTime: sh.startTime,
        endTime: sh.endTime,
        type: sh.type,
        typeValue: sh.typeValue,
      })),
    })),
  }));
}
