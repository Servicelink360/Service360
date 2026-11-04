import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import { SidebarIcon } from '@app/containers/Sidebar/SidebarMenu';
import React, { useState } from 'react';
import './nav-mock.css';

type NavItem = { label: string; icon?: string; chevron?: boolean; children?: NavItem[] };
type NavGroup = {
  id: string;
  title: string;
  color: string;
  items: NavItem[];
};

/** Same icon keys as live Sidebar `options.ts`. */
const CURRENT_TOP: NavItem[] = [
  { label: 'Dashboard', icon: 'svg-dashboard' },
  { label: 'Messages', icon: 'icon-messages' },
  { label: 'Tickets', icon: 'icon-tickets', chevron: true },
  { label: 'Camera', icon: 'icon-camera' },
  { label: 'Tasks', icon: 'icon-tasks', chevron: true },
  { label: 'Team Meeting', icon: 'icon-meeting' },
  { label: 'Meeting history', icon: 'icon-history' },
  { label: 'Invoices', icon: 'icon-invoice' },
  { label: 'Consumables', icon: 'icon-consumables' },
  { label: 'Directory', icon: 'icon-users', chevron: true },
  { label: 'Reports', icon: 'icon-reports', chevron: true },
  { label: 'Staff Management', icon: 'icon-staff', chevron: true },
  { label: 'Asset management', icon: 'icon-asset', chevron: true },
  { label: 'Management PPE', icon: 'icon-ppe', chevron: true },
  { label: 'Admin', icon: 'icon-system', chevron: true },
  { label: 'How to', icon: 'icon-help' },
];

const PROPOSED_GROUPS: NavGroup[] = [
  {
    id: 'home',
    title: 'Home',
    color: '#7CFFB2',
    items: [{ label: 'Dashboard', icon: 'svg-dashboard' }],
  },
  {
    id: 'messages',
    title: 'Messages',
    color: '#FDE68A',
    items: [
      { label: 'Messages', icon: 'icon-messages' },
      {
        label: 'Tickets',
        icon: 'icon-tickets',
        chevron: true,
        children: [
          { label: 'Pending', icon: 'icon-tickets' },
          { label: 'In progress', icon: 'icon-tickets' },
          { label: 'Completed', icon: 'icon-tickets' },
        ],
      },
    ],
  },
  {
    id: 'camera',
    title: 'Camera',
    color: '#FDBA74',
    items: [{ label: 'Camera', icon: 'icon-camera' }],
  },
  {
    id: 'ops',
    title: 'Field work',
    color: '#FFD166',
    items: [
      {
        label: 'Tasks',
        icon: 'icon-tasks',
        chevron: true,
        children: [
          { label: 'Pending', icon: 'icon-tasks' },
          { label: 'In progress', icon: 'icon-tasks' },
          { label: 'Completed', icon: 'icon-tasks' },
          { label: 'Schedule tasks', icon: 'icon-site' },
        ],
      },
    ],
  },
  {
    id: 'team-meeting',
    title: 'Team Meeting',
    color: '#8EC5FF',
    items: [
      { label: 'Team Meeting', icon: 'icon-meeting' },
      { label: 'Meeting history', icon: 'icon-history' },
    ],
  },
  {
    id: 'procurement',
    title: 'Procurement',
    color: '#FF8FAB',
    items: [
      { label: 'Invoices', icon: 'icon-invoice' },
      { label: 'Consumables', icon: 'icon-consumables' },
      { label: 'Vendors', icon: 'icon-companies' },
    ],
  },
  {
    id: 'directory',
    title: 'Directory',
    color: '#C4B5FD',
    items: [
      { label: 'Services', icon: 'icon-service' },
      { label: 'Companies', icon: 'icon-companies' },
      { label: 'Staff', icon: 'icon-staff' },
      { label: 'Admin personnel', icon: 'icon-admin' },
      { label: 'Customers', icon: 'icon-contact' },
      { label: 'Job sites', icon: 'icon-site' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    color: '#67E8F9',
    items: [
      { label: 'New Reports', icon: 'icon-report-new' },
      { label: 'Safety Audit Reports', icon: 'icon-report-safety' },
      { label: 'Faults Reports', icon: 'icon-report-fault' },
      { label: 'Audit Reports', icon: 'icon-report-audit' },
      { label: 'Monthly Reports', icon: 'icon-report-monthly' },
      { label: 'Incident Reports', icon: 'icon-report-incident' },
      { label: 'PPE report', icon: 'icon-ppe' },
      {
        label: 'Templates',
        icon: 'icon-report-templates',
        chevron: true,
        children: [
          { label: 'Report templates', icon: 'icon-report-template' },
          { label: 'Safety audit templates', icon: 'icon-report-safety-template' },
        ],
      },
    ],
  },
  {
    id: 'workforce',
    title: 'Staff Management',
    color: '#FB923C',
    items: [
      { label: 'Staff attendance', icon: 'icon-staff' },
      { label: 'Training', icon: 'icon-training' },
      { label: 'Training admin', icon: 'icon-training' },
      { label: 'Toolbox admin', icon: 'icon-toolbox' },
      { label: 'Induction', icon: 'icon-ppe' },
    ],
  },
  {
    id: 'assets',
    title: 'Assets & PPE',
    color: '#86EFAC',
    items: [
      {
        label: 'Asset management',
        icon: 'icon-asset',
        chevron: true,
        children: [{ label: 'Asset register', icon: 'icon-asset' }],
      },
      { label: 'Management PPE', icon: 'icon-ppe', chevron: true },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    color: '#CBD5E1',
    items: [
      {
        label: 'Users & roles',
        icon: 'icon-admin',
        chevron: true,
        children: [
          { label: 'Admins', icon: 'icon-admin' },
          { label: 'Roles', icon: 'icon-master' },
        ],
      },
      { label: 'Organisation', icon: 'icon-system' },
    ],
  },
  {
    id: 'help',
    title: 'Help',
    color: '#F9A8D4',
    items: [{ label: 'How to', icon: 'icon-help' }],
  },
];

const Brand: React.FC = () => (
  <div className="nm-brand">
    <div className="nm-logo" aria-hidden>
      S
    </div>
    <div>
      <div className="nm-brand-name">SERVICELINK</div>
      <div className="nm-brand-tag">Your partner in facilities</div>
    </div>
  </div>
);

const NavRow: React.FC<{
  item: NavItem;
  active?: boolean;
  nested?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}> = ({ item, active, nested, expanded, onToggle }) => {
  const hasChildren = Boolean(item.children?.length);
  return (
    <>
      <button
        type="button"
        className={`nm-row${active ? ' is-active' : ''}${nested ? ' is-nested' : ''}${
          hasChildren ? ' is-toggle' : ''
        }`}
        onClick={hasChildren ? onToggle : undefined}
        aria-expanded={hasChildren ? Boolean(expanded) : undefined}
      >
        <span className="nm-icon" aria-hidden>
          <SidebarIcon name={item.icon || 'svg-dashboard'} />
        </span>
        <span className="nm-row-label">{item.label}</span>
        {item.chevron || hasChildren ? (
          <svg
            className={`nm-row-caret${expanded ? ' is-open' : ''}`}
            viewBox="0 0 12 12"
            aria-hidden
          >
            <path
              d="M3 4.5 L6 7.5 L9 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ) : null}
      </button>
      {hasChildren && expanded
        ? item.children!.map((child) => <NavRow key={child.label} item={child} nested />)
        : null}
    </>
  );
};

const NavMockPage: React.FC = () => {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PROPOSED_GROUPS.map((g) => [g.id, false])),
  );
  const [itemOpen, setItemOpen] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleItem = (key: string) =>
    setItemOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const expandAll = () => {
    setOpen(Object.fromEntries(PROPOSED_GROUPS.map((g) => [g.id, true])));
    const next: Record<string, boolean> = {};
    PROPOSED_GROUPS.forEach((g) => {
      g.items.forEach((item) => {
        if (item.children?.length) next[`${g.id}::${item.label}`] = true;
      });
    });
    setItemOpen(next);
  };
  const collapseAll = () => {
    setOpen(Object.fromEntries(PROPOSED_GROUPS.map((g) => [g.id, false])));
    setItemOpen({});
  };

  return (
    <Layout title="Navigation mock" showPageHeader>
      <UsersDiv>
        <div className="nm">
          <header className="nm-page-head">
            <div>
              <p className="nm-kicker">UI mock · not live</p>
              <h1>Grouped sidebar</h1>
              <p className="nm-lede">
                Same green shell as today. Groups are marked with a color bar and colored section
                title — items stay white so it still feels like ServiceLink.
              </p>
            </div>
            <div className="nm-page-actions">
              <button type="button" onClick={expandAll}>
                Expand all
              </button>
              <button type="button" onClick={collapseAll}>
                Collapse all
              </button>
            </div>
          </header>

          <div className="nm-compare">
            <section className="nm-col">
              <div className="nm-col-label">
                <span>Before</span>
                <em>17 top-level · one color</em>
              </div>
              <div className="nm-shell">
                <Brand />
                <nav className="nm-nav" aria-label="Current menu">
                  {CURRENT_TOP.map((item) => (
                    <NavRow key={item.label} item={item} active={item.label === 'Messages'} />
                  ))}
                </nav>
              </div>
            </section>

            <section className="nm-col">
              <div className="nm-col-label nm-col-label--new">
                <span>After</span>
                <em>{PROPOSED_GROUPS.length} color groups · Directory unchanged</em>
              </div>
              <div className="nm-shell">
                <Brand />
                <nav className="nm-nav" aria-label="Proposed grouped menu">
                  {PROPOSED_GROUPS.map((group, index) => {
                    const isOpen = open[group.id];
                    return (
                      <div
                        key={group.id}
                        className={`nm-group${isOpen ? ' is-open' : ''}`}
                        style={{ ['--g' as string]: group.color }}
                      >
                        {index > 0 ? <div className="nm-divider" /> : null}
                        <button
                          type="button"
                          className="nm-group-head"
                          onClick={() => toggle(group.id)}
                          aria-expanded={isOpen}
                        >
                          <span className="nm-group-bar" aria-hidden />
                          <span className="nm-group-title">{group.title}</span>
                          <svg
                            className={`nm-group-caret${isOpen ? ' is-open' : ''}`}
                            viewBox="0 0 12 12"
                            aria-hidden
                          >
                            <path
                              d="M3 4.5 L6 7.5 L9 4.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                        {isOpen ? (
                          <div className="nm-group-body">
                            {group.items.map((item) => {
                              const itemKey = `${group.id}::${item.label}`;
                              return (
                                <NavRow
                                  key={item.label}
                                  item={item}
                                  active={item.label === 'Messages'}
                                  expanded={Boolean(itemOpen[itemKey])}
                                  onToggle={() => toggleItem(itemKey)}
                                />
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </nav>
              </div>
            </section>
          </div>

          <section className="nm-key" aria-label="Color key">
            <h2>Group colors</h2>
            <ul>
              {PROPOSED_GROUPS.map((group) => (
                <li key={group.id} style={{ ['--g' as string]: group.color }}>
                  <span className="nm-key-bar" />
                  <strong>{group.title}</strong>
                  <span>
                    {group.items
                      .map((i) =>
                        i.children?.length
                          ? `${i.label} → ${i.children.map((c) => c.label).join(', ')}`
                          : i.label,
                      )
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </UsersDiv>
    </Layout>
  );
};

export default NavMockPage;
