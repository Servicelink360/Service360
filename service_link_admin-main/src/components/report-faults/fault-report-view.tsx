import { CloseOutlined } from "@ant-design/icons";
import { dateTimeFormat } from "@app/config/data.config";
import { Button, Image, Modal, Typography } from "antd";
import moment from "moment";
import React from "react";
import { Link } from "react-router-dom";
import { userType } from "../../constants/statusUser";

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
  renderPriority: (priority: number | undefined) => React.ReactNode;
  readStatusNode?: React.ReactNode;
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
  readStatusNode,
}) => {
  if (!open || !record) return null;

  const mediaUrls = parseAttachFiles(record.attachFiles);
  const faultId = reportFaultIdOf(record);
  const created = record.createdAt || record.updatedAt;
  const customerLabel =
    record.companyName || record.customerName || record.customer?.fullName || "—";
  const canMessage =
    (viewerType === userType.ADMIN || viewerType === userType.CUSTOMER) && Boolean(faultId);

  return (
    <Modal
      visible
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
          {renderPriority(record.priority)}
        </InlineLabelValue>
      </div>

      <div style={{ marginTop: 16 }}>
        <MetaInline label="Issue">
          {record.issue?.trim() || record.subject?.trim() || "—"}
        </MetaInline>
      </div>

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
    </Modal>
  );
};

export default FaultReportViewModal;
