import React from 'react';
import { Link } from 'react-router-dom';
import { DownOutlined } from '@ant-design/icons';
import IntlMessages from '@app/components/utility/intlMessages';
import { SidebarIcon, stripTrailingSlash } from './SidebarMenu';
import type { option } from './options';
import './grouped-sidebar-nav.css';

type Props = {
  options: option[];
  url: string;
  pathLeaf: string;
  openKeys: string[];
  onOpenChange: (keys: string[]) => void;
  onNavigate?: () => void;
  /** Optional unread badge for Messages (existing app can pass real count). */
  messagesBadge?: number;
};

const ICON_BY_KEY: Record<string, string> = {
  dashboard: 'svg-dashboard',
  messages: 'icon-messages',
  tickets: 'icon-tickets',
  'field-photos': 'icon-camera',
  'task-today': 'icon-tasks',
  'my-tasks': 'icon-my-tasks',
  'site-check-in': 'icon-checkin',
  'user-sites': 'icon-site',
  'team-meeting': 'icon-meeting',
  'meeting-history': 'icon-history',
  invoices: 'icon-invoice',
  consumables: 'icon-consumables',
  services: 'icon-service',
  companies: 'icon-companies',
  staff: 'icon-staff',
  'admin-personnel': 'icon-admin',
  'customer-personnel': 'icon-staff',
  customers: 'icon-contact',
  sites: 'icon-site',
  'new-reports': 'icon-report-new',
  'safety-audits': 'icon-report-safety',
  'report-faults': 'icon-report-fault',
  'audit-report': 'icon-report-audit',
  'monthly-report': 'icon-report-monthly',
  'incident-report': 'icon-report-incident',
  'ppe-report': 'icon-ppe',
  'report-templates-menu': 'icon-report-templates',
  'report-templates': 'icon-report-template',
  'safety-audit-templates': 'icon-report-safety-template',
  'staff-attendance': 'icon-staff',
  training: 'icon-training',
  'training-menu': 'icon-training',
  'training-admin': 'icon-training',
  toolbox: 'icon-toolbox',
  'toolbox-admin': 'icon-toolbox',
  induction: 'icon-ppe',
  asset: 'icon-asset',
  'asset-register': 'icon-asset',
  'manageme-PPE': 'icon-ppe',
  'users-roles': 'icon-admin',
  admins: 'icon-admin',
  roles: 'icon-master',
  settings: 'icon-system',
  'how-to': 'icon-help',
};

function iconNameFor(item: option): string {
  return ICON_BY_KEY[String(item.key)] || item.leftIcon || 'svg-dashboard';
}

function itemMatches(itemKey: string, pathLeaf: string, hasChildren: boolean): boolean {
  const key = String(itemKey);
  const leaf = String(pathLeaf || '');
  if (key === leaf) return true;
  const itemPath = key.split('?')[0];
  const leafPath = leaf.split('?')[0];
  if (itemPath !== leafPath) return false;
  if (key.includes('?')) return key === leaf;
  if (leaf.includes('?')) return false;
  return !hasChildren;
}

const NavItem: React.FC<{
  item: option;
  base: string;
  pathLeaf: string;
  openKeys: string[];
  onToggle: (key: string) => void;
  onNavigate?: () => void;
  nested?: boolean;
  messagesBadge?: number;
}> = ({ item, base, pathLeaf, openKeys, onToggle, onNavigate, nested, messagesBadge }) => {
  const key = String(item.key);
  const hasChildren = Boolean(item.children?.length);
  const expanded = openKeys.includes(key);
  const selected = itemMatches(key, pathLeaf, hasChildren);
  const iconName = iconNameFor(item);
  const panelId = `sl-sub-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const badge =
    key === 'messages' && messagesBadge && messagesBadge > 0 ? messagesBadge : 0;

  if (hasChildren) {
    return (
      <>
        <button
          type="button"
          className={`sl-item${nested ? ' nested' : ''}${selected ? ' selected' : ''}`}
          onClick={() => onToggle(key)}
          aria-expanded={expanded}
          aria-controls={panelId}
        >
          <span className="sl-icon" aria-hidden>
            <SidebarIcon name={iconName} />
          </span>
          <span className="sl-item-name">
            <IntlMessages id={item.label} />
          </span>
          <DownOutlined className={`sl-item-caret${expanded ? ' open' : ''}`} aria-hidden />
        </button>
        <div id={panelId} className="sl-subitems" hidden={!expanded}>
          {expanded
            ? item.children!.map((child: option) => (
                <NavItem
                  key={String(child.key)}
                  item={child}
                  base={base}
                  pathLeaf={pathLeaf}
                  openKeys={openKeys}
                  onToggle={onToggle}
                  onNavigate={onNavigate}
                  nested
                  messagesBadge={messagesBadge}
                />
              ))
            : null}
        </div>
      </>
    );
  }

  return (
    <Link
      to={`${base}/${key}`}
      className={`sl-item${nested ? ' nested' : ''}${selected ? ' selected' : ''}`}
      onClick={onNavigate}
      aria-current={selected ? 'page' : undefined}
    >
      <span className="sl-icon" aria-hidden>
        <SidebarIcon name={iconName} />
      </span>
      <span className="sl-item-name">
        <IntlMessages id={item.label} />
      </span>
      {badge > 0 ? (
        <span className="sl-count" aria-label={`${badge} unread`}>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
};

export default function GroupedSidebarNav({
  options: menuOptions,
  url,
  pathLeaf,
  openKeys,
  onOpenChange,
  onNavigate,
  messagesBadge,
}: Props) {
  const base = stripTrailingSlash(url);
  /** All groups collapsed by default. */
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});

  const toggleKey = (key: string) => {
    if (openKeys.includes(key)) {
      onOpenChange(openKeys.filter((k) => k !== key));
    } else {
      onOpenChange([...openKeys, key]);
    }
  };

  return (
    <div className="sl-nav">
      <nav aria-label="Main">
        {menuOptions.map((group) => {
          const isGroup = Boolean(group.groupColor && group.children?.length);
          if (!isGroup) {
            return (
              <NavItem
                key={String(group.key)}
                item={group}
                base={base}
                pathLeaf={pathLeaf}
                openKeys={openKeys}
                onToggle={toggleKey}
                onNavigate={onNavigate}
                messagesBadge={messagesBadge}
              />
            );
          }

          if (String(group.key) === 'nav-home') {
            return null;
          }

          const sectionKey = String(group.key);
          const isOpen = Boolean(expandedSections[sectionKey]);
          const panelId = `sl-panel-${sectionKey}`;

          return (
            <div
              className={`sl-section${isOpen ? ' is-open' : ''}`}
              key={sectionKey}
              style={{ ['--g' as string]: group.groupColor }}
            >
              <button
                type="button"
                className="sl-heading"
                onClick={() =>
                  setExpandedSections((prev) => ({
                    ...prev,
                    [sectionKey]: !prev[sectionKey],
                  }))
                }
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span
                  className="sl-indicator"
                  style={{ background: group.groupColor }}
                  aria-hidden
                />
                <span className="sl-heading-label">
                  <IntlMessages id={group.label} />
                </span>
                <DownOutlined className={isOpen ? 'is-open' : ''} aria-hidden />
              </button>

              <div className="sl-panel" id={panelId}>
                <div className="sl-panel-inner">
                  <div className="sl-items" role="region" aria-label={group.label}>
                    {group.children!.map((item: option) => (
                      <NavItem
                        key={String(item.key)}
                        item={item}
                        base={base}
                        pathLeaf={pathLeaf}
                        openKeys={openKeys}
                        onToggle={toggleKey}
                        onNavigate={onNavigate}
                        messagesBadge={messagesBadge}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
