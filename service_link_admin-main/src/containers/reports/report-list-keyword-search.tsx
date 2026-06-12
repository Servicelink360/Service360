import React from "react";
import { Input } from "antd";

type Props = {
  value: string;
  disabled?: boolean;
  mobileUiDark?: boolean;
  isMobilePortrait?: boolean;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
};

const ReportListKeywordSearch: React.FC<Props> = ({
  value,
  disabled,
  mobileUiDark,
  isMobilePortrait,
  onChange,
  onSearch,
}) => (
  <Input
    className={mobileUiDark ? "nr-mobile-dark-field" : undefined}
    allowClear
    placeholder="Job site or service"
    disabled={disabled}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onPressEnter={(e) => onSearch((e.target as HTMLInputElement).value)}
    style={
      isMobilePortrait || mobileUiDark
        ? { flex: 1, minWidth: 160, width: "100%" }
        : { width: 280, maxWidth: 520 }
    }
  />
);

export default ReportListKeywordSearch;
