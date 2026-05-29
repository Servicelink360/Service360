/** All active staff can use this template in New Report. */
export const ASSIGNED_STAFF_ALL = 0;

export const isAssignedToAllStaff = (assignedStaffId?: number | null): boolean =>
  assignedStaffId === ASSIGNED_STAFF_ALL;
