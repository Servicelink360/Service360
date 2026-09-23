import { Modal, Progress, Typography } from "antd";
import React, { useRef, useState } from "react";
import { createGlobalStyle } from "styled-components";

const FaultUploadProgressStyles = createGlobalStyle`
  .ant-modal.new-report-progress-modal--dark .ant-modal-content {
    background: #1e1e1e !important;
    border: 1px solid #444444 !important;
    border-radius: 16px !important;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55) !important;
  }
  .ant-modal.new-report-progress-modal--dark .ant-modal-header {
    background: #141414 !important;
    border-bottom: 1px solid #333333 !important;
    padding: 14px 16px !important;
  }
  .ant-modal.new-report-progress-modal--dark .ant-modal-title {
    color: #ffffff !important;
    font-weight: 700 !important;
    text-align: center;
  }
  .ant-modal.new-report-progress-modal--dark .ant-modal-body {
    background: #1e1e1e !important;
    color: #f0f0f0 !important;
  }
  .ant-modal.new-report-progress-modal--dark .ant-progress-text {
    color: #ffffff !important;
    font-weight: 700 !important;
  }
  .ant-modal.new-report-progress-modal--dark .ant-progress-inner {
    background: #333333 !important;
  }
  .ant-modal.new-report-progress-modal--dark .ant-progress-bg {
    background: #52c41a !important;
  }
`;

type UploadUi = {
    open: boolean;
    percent: number;
    current: number;
    total: number;
};

const closedUi: UploadUi = { open: false, percent: 0, current: 0, total: 0 };

export function useFaultUploadProgress() {
    const jobsRef = useRef<Map<string, number>>(new Map());
    const closeTimerRef = useRef<number | null>(null);
    const [ui, setUi] = useState<UploadUi>(closedUi);

    const clearCloseTimer = () => {
        if (closeTimerRef.current != null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const publish = () => {
        const values = Array.from(jobsRef.current.values());
        if (!values.length) return;
        const total = values.length;
        const percent = Math.round(values.reduce((sum, value) => sum + value, 0) / total);
        const finished = values.filter((value) => value >= 100).length;
        const current = Math.min(total, Math.max(1, finished < total ? finished + 1 : total));
        setUi({ open: true, percent, current, total });
    };

    const begin = (id: string) => {
        clearCloseTimer();
        jobsRef.current.set(id, 0);
        publish();
    };

    const update = (id: string, percent: number) => {
        if (!jobsRef.current.has(id)) return;
        jobsRef.current.set(id, Math.max(0, Math.min(99, Math.round(percent))));
        publish();
    };

    const end = (id: string) => {
        jobsRef.current.delete(id);
        if (jobsRef.current.size > 0) {
            publish();
            return;
        }
        setUi((prev) => ({
            open: true,
            percent: 100,
            current: prev.total || 1,
            total: prev.total || 1,
        }));
        closeTimerRef.current = window.setTimeout(() => {
            closeTimerRef.current = null;
            if (jobsRef.current.size === 0) setUi(closedUi);
        }, 450);
    };

    return { ui, begin, update, end };
}

export function FaultUploadProgressModal({
    open,
    percent,
    current,
    total,
    dark,
}: UploadUi & { dark?: boolean }) {
    return (
        <>
        <FaultUploadProgressStyles />
        <Modal
            className={
                dark
                    ? "new-report-progress-modal new-report-progress-modal--dark"
                    : "new-report-progress-modal new-report-progress-modal--app"
            }
            visible={open}
            open={open}
            closable={false}
            maskClosable={false}
            keyboard={false}
            footer={null}
            zIndex={1200}
            centered
            width={480}
            maskStyle={{
                backgroundColor: dark ? "rgba(0, 0, 0, 0.82)" : "rgba(20, 61, 36, 0.45)",
            }}
            title="Uploading media"
        >
            <div style={{ padding: "8px 4px 16px" }}>
                <Typography.Title
                    level={4}
                    style={{
                        marginBottom: 8,
                        textAlign: "center",
                        fontWeight: 600,
                        color: dark ? "#ffffff" : "#1a4d2e",
                    }}
                >
                    Uploading media
                </Typography.Title>
                {total > 0 ? (
                    <Typography.Text
                        strong
                        style={{
                            display: "block",
                            marginBottom: 20,
                            textAlign: "center",
                            fontSize: 16,
                            color: dark ? "#85c179" : "#1f6b3a",
                        }}
                    >
                        File {current} of {total}
                    </Typography.Text>
                ) : null}
                <Progress
                    percent={percent}
                    status={percent >= 100 ? "success" : "active"}
                    strokeColor={dark ? "#52c41a" : "#1f6b3a"}
                    trailColor={dark ? "#333333" : "#d7e8d2"}
                    strokeWidth={12}
                    format={(pct) => `${pct}%`}
                />
                <Typography.Text
                    style={{
                        display: "block",
                        marginTop: 16,
                        textAlign: "center",
                        color: dark ? "#b0b0b0" : "#3d6b4a",
                    }}
                >
                    {percent}% complete. Please keep this window open until finished.
                </Typography.Text>
            </div>
        </Modal>
        </>
    );
}
