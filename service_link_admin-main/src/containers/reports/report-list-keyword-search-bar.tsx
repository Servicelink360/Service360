import React from "react";
import { Typography } from "antd";
import ReportListKeywordSearch from "./report-list-keyword-search";

type Props = {
  value: string;
  disabled?: boolean;
  mobileUiDark?: boolean;
  isMobilePortrait?: boolean;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
};

const ReportListKeywordSearchBar: React.FC<Props> = (props) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      flexWrap: "wrap",
    }}
  >
    <Typography.Text strong style={{ color: props.mobileUiDark ? "#ffffff" : undefined }}>
      Search:
    </Typography.Text>
    <ReportListKeywordSearch {...props} />
  </div>
);

export default ReportListKeywordSearchBar;
