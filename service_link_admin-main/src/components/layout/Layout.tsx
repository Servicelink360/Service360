import Box from '@app/components/utility/box';
import ContentHolder from '@app/components/utility/contentHolder';
import LayoutWrapper from '@app/components/utility/layoutWrapper';
import { Col, Row } from 'antd';
import React from 'react';
import { useIntl } from 'react-intl';

type Props = {
  /** Ignored by default — page title is shown only in the top bar. */
  title?: string,
  subtitle?: string,
  /** Set true only if this page needs a heading inside the white card. */
  showPageHeader?: boolean,
  children: any
}

/** e.g. sidebar.dashboard, forms.progressBar.dashboardTitle, staffAttendance.subtitle */
function isMessageId(value: string): boolean {
  return /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(value);
}

function resolveMessage(intl: ReturnType<typeof useIntl>, value?: string): string {
  if (!value) return '';
  if (isMessageId(value)) {
    return intl.formatMessage({ id: value, defaultMessage: value });
  }
  return value;
}

export default function (props: Props) {
  const intl = useIntl();
  const showHeader = props.showPageHeader === true;
  const pageTitle = showHeader ? resolveMessage(intl, props.title) : '';
  const pageSubtitle = showHeader ? resolveMessage(intl, props.subtitle) : '';

  const rowStyle = {
    width: '100%',
    display: 'flex',
    flexFlow: 'row wrap',
    margin: 0
  };
  const colStyle = {
    padding: 0,
  };
  const gutter = 16;
  return (
    <LayoutWrapper>
      <Row style={rowStyle} gutter={gutter} justify="start">
        <Col md={24} sm={24} xs={24} style={colStyle}>
          <Box
            title={pageTitle || ''}
            subtitle={pageSubtitle || ''}
          >
            <ContentHolder>
              {props.children}
            </ContentHolder>
          </Box>
        </Col>
      </Row>
    </LayoutWrapper>
  );
}
