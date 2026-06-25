import { CheckCircleOutlined, CloseOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { dateTimeFormat } from "@app/config/data.config";
import { Button, Image, Modal, Popconfirm, Tag, Typography, message } from "antd";
import moment from "moment";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { userType } from "../../constants/statusUser";
import { isPublicAmenitiesCleaningService } from "../../constants/reportFaultToiletArea";
import endPoint from "../../constants/endPoint";
import serviceType from "../../constants/serviceType";
import { callAPIAsync } from "../../library/helpers/api";
import FaultDelegationModal from "./fault-delegation-modal";
import FaultDelegationSummary from "./fault-delegation-summary";
import { canManageFaultDelegation } from "./fault-delegation-cell";
import { delegationOutcomeOf, faultListStatusOf } from "./delegation-outcome";
import { FaultPriorityCell } from "./fault-priority-cell";

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  color: "rgba(0, 0, 0, 0.88)",
  fontWeight: 500,
  lineHeight: 1.5,
  wordBreak: "break-word",
};

/** Subject & message body text � 20% smaller than default valueStyle (14px ? 11.2px). */
const subjectMessageValueStyle: React.CSSProperties = {
  ...valueStyle,
  fontSize: 11.2,
  lineHeight: 1.45,
};

/** Header inline values (Site, Customer, �). */
const metaValueStyle: React.CSSProperties = {
  ...valueStyle,
  fontSize: 10,
  lineHeight: 1.35,
};

const labelBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1px 7px",
  minHeight: 18,
  borderRadius: 6,
  border: "1px solid #e4e7ec",
  background: "linear-gradient(180deg, #ffffff 0%, #f4f6f8 100%)",
  color: "#5c6670",
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1.2,
  letterSpacing: 0.02,
  whiteSpace: "nowrap",
  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.06)",
};

type Props = {
  open: boolean;
  onClose: () => void;
  record: any | null;
  viewerType: number;
  renderPriority?: (priority: number | undefined) => React.ReactNode;
  onPriorityUpdated?: (payload?: { id?: number; priority?: number }) => void;
  isDeletedTab?: boolean;
  staffUserId?: number;
  readStatusNode?: React.ReactNode;
  onDelegationSaved?: (delegation?: Record<string, unknown>) => void;
  onFaultCompleted?: (payload?: Record<string, unknown>) => void;
};

const parseAttachFiles = (attachFiles: unknown): string[] => {
  if (!attachFiles) return [];
  if (Array.isArray(attachFiles)) return attachFiles.filter(Boolean).map(String);
  try {
    const parsed = JSON.parse(String(attachFiles));
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
};

const reportFaultIdOf = (record: any) => record?.reportFaultId ?? record?.id;

const LabelBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={labelBadgeStyle}>{children}</span>
);

const BadgeLabel: React.FC<{ label: string }> = ({ label }) => (
  <LabelBadge>{label}</LabelBadge>
);

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
  inline?: boolean;
  compactValue?: boolean;
}> = ({ label, children, align = "left", inline = false, compactValue = false }) => {
  const valStyle = compactValue ? subjectMessageValueStyle : valueStyle;
  if (inline) {
    return (
      <div
        style={{
          textAlign: align,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          gap: "4px 6px",
        }}
      >
        <BadgeLabel label={label} />
        <div style={{ ...valStyle, flex: "1 1 auto", minWidth: 0 }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ textAlign: align }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 4,
        }}
      >
        <BadgeLabel label={label} />
      </div>
      <div style={valStyle}>{children}</div>
    </div>
  );
};

const MetaInline: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap",
      flex: "0 0 auto",
    }}
  >
    <BadgeLabel label={label} />
    <span style={{ ...metaValueStyle, marginLeft: 2 }}>{children}</span>
  </span>
);

const InlineLabelValue: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
    <BadgeLabel label={label} />
    <span style={{ display: "inline-flex", alignItems: "center" }}>{children}</span>
  </span>
);

/** Fault report read-only view � horizontal meta header, content left, status/priority right. */
const FaultReportViewModal: React.FC<Props> = ({
  open,
  onClose,
  record,
  viewerType,
  renderPriority,
  onPriorityUpdated,
  isDeletedTab = false,
  staffUserId,
  readStatusNode,
  onDelegationSaved,
  onFaultCompleted,
}) => {
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [markingStaffActed, setMarkingStaffActed] = useState(false);

  if (!open || !record) return null;

  const mediaUrls = parseAttachFiles(record.attachFiles);
  const faultId = reportFaultIdOf(record);
  const created = record.createdAt || record.updatedAt;
  const customerLabel =
    record.companyName || record.customerName || record.customer?.fullName || "—";
  const toiletArea =
    String(record.toiletArea ?? record.toilet_area ?? "").trim() || "";
  const showToiletArea =
    Boolean(toiletArea) || isPublicAmenitiesCleaningService(record.serviceName);
  const canMessage =
    (viewerType === userType.ADMIN || viewerType === userType.CUSTOMER) && Boolean(faultId);
  const canDelegate =
    canManageFaultDelegation(record, viewerType) && Boolean(faultId);
  const hasDelegation = Boolean(String(record?.delegatedToType ?? '').trim());
  const isCompleted = faultListStatusOf(record) === 'completed';
  const delegationOutcome = delegationOutcomeOf(record);
  const canManageFaultStatus =
    viewerType === userType.CUSTOMER || viewerType === userType.ADMIN;
  const canMarkCompleted =
    canManageFaultStatus && Boolean(faultId) && !isCompleted;
  const canReopen =
    canManageFaultStatus &&
    Boolean(faultId) &&
    (isCompleted ||
      delegationOutcome === "done_on_time" ||
      delegationOutcome === "done_late");

  const staffProfileRaw = localStorage.getItem("profile");
  const profileStaffUserId = staffProfileRaw ? +JSON.parse(staffProfileRaw).id : 0;
  const resolvedStaffUserId = staffUserId ?? profileStaffUserId;
  const isStaffAssignee =
    viewerType === userType.STAFF &&
    record?.delegatedToType === "staff" &&
    +record?.delegatedToStaffId === resolvedStaffUserId;
  const canMarkStaffActed = isStaffAssignee && Boolean(faultId) && !record?.delegatedActedAt;

  const markCompleted = async () => {
    if (!faultId) return;
    setCompleting(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/${faultId}/complete`,
        "PATCH",
        {},
      );
      if (res?.code !== 1) {
        message.error(res?.message || "Could not mark as completed");
        return;
      }
      message.success("Fault report marked as completed");
      onFaultCompleted?.(res.data);
    } catch {
      message.error("Could not mark as completed");
    } finally {
      setCompleting(false);
    }
  };

  const markStaffActed = async () => {
    if (!faultId) return;
    setMarkingStaffActed(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/${faultId}/staff-acted`,
        "PATCH",
        {},
      );
      if (res?.code !== 1) {
        message.error(res?.message || "Could not confirm action");
        return;
      }
      message.success("Thank you — assignment marked as acted on.");
      onFaultCompleted?.(res.data);
    } catch {
      message.error("Could not confirm action");
    } finally {
      setMarkingStaffActed(false);
    }
  };

  const markReopened = async () => {
    if (!faultId) return;
    setReopening(true);
    try {
      const res = await callAPIAsync(
        serviceType.COMMON,
        `${endPoint.REPORT_FAULTS}/${faultId}/reopen`,
        "PATCH",
        {},
      );
      if (res?.code !== 1) {
        message.error(res?.message || "Could not reopen fault");
        return;
      }
      message.success("Fault report set back to pending");
      onFaultCompleted?.(res.data);
    } catch {
      message.error("Could not reopen fault");
    } finally {
      setReopening(false);
    }
  };

  return (
    <Modal
      open
      title={<span style={{ fontWeight: 600, fontSize: 9.6 }}>Fault Report</span>}
      onCancel={onClose}
      width={900}
      centered
      destroyOnClose
      footer={
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {canReopen ? (
            <Popconfirm
              title={
                <span>
                  Set back to pending?
                  <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                    The fault will show as pending again if it was marked completed by mistake.
                  </div>
                </span>
              }
              okText="Back to pending"
              cancelText="Cancel"
              onConfirm={() => void markReopened()}
            >
              <Button loading={reopening}>Back to pending</Button>
            </Popconfirm>
          ) : null}
          {canMarkCompleted ? (
            <Popconfirm
              title={
                <span>
                  Mark this fault report as completed?
                  <div style={{ marginTop: 8, fontWeight: 400, fontSize: 12, color: "#595959" }}>
                    Use when the issue is resolved. Delegation status will update if applicable.
                  </div>
                </span>
              }
              okText="Mark completed"
              cancelText="Cancel"
              onConfirm={() => void markCompleted()}
            >
              <Button icon={<CheckCircleOutlined />} loading={completing}>
                Mark as completed
              </Button>
            </Popconfirm>
          ) : null}
          {canMarkStaffActed ? (
            <Popconfirm
              title="Confirm you have acted on this assignment?"
              okText="Confirm acted"
              cancelText="Cancel"
              onConfirm={() => void markStaffActed()}
            >
              <Button icon={<CheckCircleOutlined />} loading={markingStaffActed}>
                Confirm acted
              </Button>
            </Popconfirm>
          ) : null}
          {canDelegate ? (
            <Button icon={<UserSwitchOutlined />} onClick={() => setDelegationOpen(true)}>
              {hasDelegation ? 'Change assignment' : 'Assign to'}
            </Button>
          ) : null}
          {canMessage && faultId ? (
            <Link to={`/messages?reportFaultId=${faultId}`}>
              <Button onClick={onClose}>Message about this report</Button>
            </Link>
          ) : null}
          <Button type="primary" icon={<CloseOutlined />} onClick={onClose}>
            Close
          </Button>
        </div>
      }
      bodyStyle={{ maxHeight: "75vh", overflow: "auto", padding: "12px 24px 16px" }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "center",
          gap: 16,
          paddingBottom: 14,
          borderBottom: "1px solid #f0f0f0",
          overflowX: "auto",
        }}
      >
        <MetaInline label="Site name">{record.siteName || "—"}</MetaInline>
        <MetaInline label="Customer name">{customerLabel}</MetaInline>
        <MetaInline label="Service name">{record.serviceName || "—"}</MetaInline>
        <MetaInline label="Time">
          {created ? moment(created).format(dateTimeFormat) : "—"}
        </MetaInline>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          gap: 12,
          paddingTop: 16,
          flexWrap: "nowrap",
        }}
      >
        {readStatusNode ? (
          <InlineLabelValue label="Status">{readStatusNode}</InlineLabelValue>
        ) : null}
        <InlineLabelValue label="Priority">
          {renderPriority ? (
            renderPriority(record.priority)
          ) : (
            <FaultPriorityCell
              record={record}
              profileType={viewerType}
              staffUserId={resolvedStaffUserId}
              isDeletedTab={isDeletedTab}
              onUpdated={onPriorityUpdated}
              small
            />
          )}
        </InlineLabelValue>
        {isCompleted ? (
          <Tag color="success" style={{ marginLeft: 4 }}>
            Completed
          </Tag>
        ) : delegationOutcome === "done_on_time" || delegationOutcome === "done_late" ? (
          <Tag color="success" style={{ marginLeft: 4 }}>
            Delegation done
          </Tag>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <MetaInline label="Issue">
          {record.issue?.trim() || record.subject?.trim() || "—"}
        </MetaInline>
      </div>

      {showToiletArea ? (
        <div style={{ marginTop: 16 }}>
          <MetaInline label="Toilet">{toiletArea || "—"}</MetaInline>
        </div>
      ) : null}

      <FaultDelegationSummary record={record} viewerType={viewerType} />

      <div style={{ marginTop: 16 }}>
        <Field label="Message" compactValue>
          <Typography.Paragraph
            style={{
              ...subjectMessageValueStyle,
              marginBottom: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {record.message?.trim() ? record.message : "—"}
          </Typography.Paragraph>
        </Field>
      </div>

      {mediaUrls.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 8,
            }}
          >
            <BadgeLabel label="Media files" />
          </div>
          <Image.PreviewGroup>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {mediaUrls.map((url) => (
                <Image
                  key={url}
                  src={url}
                  width={88}
                  height={88}
                  style={{ objectFit: "cover", borderRadius: 4 }}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        </div>
      ) : null}

      {canDelegate && faultId ? (
        <FaultDelegationModal
          open={delegationOpen}
          onClose={() => setDelegationOpen(false)}
          faultId={faultId}
          record={record}
          viewerType={viewerType}
          onSaved={onDelegationSaved}
        />
      ) : null}
    </Modal>
  );
};

export default FaultReportViewModal;
