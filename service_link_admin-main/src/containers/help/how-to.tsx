import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { userType } from '@app/constants/statusUser';
import { HelpPageWrap } from './how-to.styles';

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="help-nav-link">
    {children}
  </Link>
);

function readProfileType(): number {
  try {
    const raw = localStorage.getItem('profile');
    if (!raw) return userType.ADMIN;
    const profile = JSON.parse(raw);
    return +profile?.type || userType.ADMIN;
  } catch {
    return userType.ADMIN;
  }
}

/** Admin: set up the organisation (existing guide). */
const AdminHowTo: React.FC = () => (
  <>
    <h1>How to set up ServiceLink</h1>
    <p className="help-intro">
      Use this guide when onboarding a new organisation. Create master data first, then people,
      then job sites and tasks. The order below matches how the system links records together.
    </p>

    <nav className="help-toc" aria-label="On this page">
      <strong>On this page</strong>
      <a href="#concepts">Concepts</a>
      <a href="#order">Recommended order</a>
      <a href="#menus">Where to click</a>
      <a href="#dependencies">Dependencies</a>
      <a href="#example">Example first day</a>
      <a href="#mistakes">Common mistakes</a>
      <a href="#day-to-day">Day-to-day admin</a>
    </nav>

    <h2 id="concepts">Concepts</h2>
    <table className="help-table">
      <thead>
        <tr>
          <th>Term</th>
          <th>Meaning</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Company</td>
          <td>The organisation (e.g. a council). Shared by several customer logins.</td>
        </tr>
        <tr>
          <td>Customer (user)</td>
          <td>A login for one person at that company — not the same as the company record.</td>
        </tr>
        <tr>
          <td>Staff (user)</td>
          <td>Field worker who completes tasks and reports on site.</td>
        </tr>
        <tr>
          <td>Admin (user)</td>
          <td>Back-office user who manages the system.</td>
        </tr>
        <tr>
          <td>Service</td>
          <td>Service line (Cleaning, Grounds, etc.). Required on each job-site line.</td>
        </tr>
        <tr>
          <td>Job site</td>
          <td>A physical location (building, park, depot).</td>
        </tr>
        <tr>
          <td>Site item</td>
          <td>
            One row on a job site: Service + company/customer + staff (and shifts). A site
            can have many site items.
          </td>
        </tr>
      </tbody>
    </table>

    <h2 id="order">Recommended order</h2>

    <div className="help-phase">
      <div className="help-phase-title">Phase 1 — Foundation (nothing else required first)</div>
      <ol>
        <li>
          <strong>Roles</strong> (for admin permissions) —{' '}
          <NavLink to="/roles">Admin → Users & roles → Roles</NavLink>
        </li>
        <li>
          <strong>Services</strong> —{' '}
          <NavLink to="/services">Directory → Services → New</NavLink>
        </li>
        <li>
          <strong>Companies</strong> — <NavLink to="/companies">Directory → Companies → New</NavLink> (or
          use <strong>New</strong> next to Company when adding a customer)
        </li>
      </ol>
    </div>

    <div className="help-phase">
      <div className="help-phase-title">Phase 2 — People</div>
      <ol>
        <li>
          <strong>Admin users</strong> — <NavLink to="/admins">Admin → Users & roles → Admins → New</NavLink>.
          Assign at least one role. You need an admin account to use this portal.
        </li>
        <li>
          <strong>Staff users</strong> — <NavLink to="/staff">Directory → Staff → New</NavLink>.
          Can be created before job sites; assign them to sites later.
        </li>
        <li>
          <strong>Customer users</strong> —{' '}
          <NavLink to="/customers">Directory → Customers → New</NavLink>.{' '}
          <strong>Company is required.</strong> Multiple people can share the same company.
        </li>
      </ol>
    </div>

    <div className="help-phase">
      <div className="help-phase-title">Phase 3 — Job sites</div>
      <ol>
        <li>
          <strong>Job site header</strong> — <NavLink to="/sites">Directory → Job sites → New</NavLink>:
          name, location, address, check-in distance.
        </li>
        <li>
          <strong>Site items</strong> — on the same form, add one or more lines, each with:
          <ul>
            <li>Service (must exist)</li>
            <li>Company / customer organisation (from Companies)</li>
            <li>Staff and shift times (needed for tasks and for staff to see work)</li>
          </ul>
        </li>
      </ol>
    </div>

    <div className="help-phase">
      <div className="help-phase-title">Phase 4 — Work and reports (after sites exist)</div>
      <ol>
        <li>
          <strong>Report templates</strong> —{' '}
          <NavLink to="/report-templates">Reports → Templates → Report templates</NavLink>
          {' · '}
          <NavLink to="/safety-audit-templates">Audit templates</NavLink>
          {' · '}
          <NavLink to="/safety-audits">Safety audits</NavLink>
          {' · '}
          <NavLink to="/incident-report">Incident report</NavLink>
        </li>
        <li>
          <strong>Scheduled tasks</strong> — Tasks menu: needs sites with site items, staff on
          those items, and usually a report template.
        </li>
        <li>Tickets, fault reports, and messages use the users and sites you already created.</li>
      </ol>
    </div>

    <h2 id="menus">Where to click</h2>
    <table className="help-table">
      <thead>
        <tr>
          <th>Goal</th>
          <th>Menu</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Organisation</td>
          <td>
            <NavLink to="/companies">Directory → Companies</NavLink>
          </td>
        </tr>
        <tr>
          <td>Client login</td>
          <td>
            <NavLink to="/customers">Directory → Customers</NavLink>
          </td>
        </tr>
        <tr>
          <td>Field worker login</td>
          <td>
            <NavLink to="/staff">Directory → Staff</NavLink>
          </td>
        </tr>
        <tr>
          <td>Office / admin login</td>
          <td>
            <NavLink to="/admins">Admin → Users & roles → Admins</NavLink>
          </td>
        </tr>
        <tr>
          <td>Service type</td>
          <td>
            <NavLink to="/services">Directory → Services</NavLink>
          </td>
        </tr>
        <tr>
          <td>Location + who serves it</td>
          <td>
            <NavLink to="/sites">Directory → Job sites</NavLink> (header + site items)
          </td>
        </tr>
        <tr>
          <td>Admin permissions</td>
          <td>
            <NavLink to="/roles">Admin → Users & roles → Roles</NavLink>
          </td>
        </tr>
      </tbody>
    </table>

    <h2 id="dependencies">Dependencies</h2>
    <table className="help-table">
      <thead>
        <tr>
          <th>To create…</th>
          <th>You need first…</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Customer user</td>
          <td>Company</td>
        </tr>
        <tr>
          <td>Job site site item</td>
          <td>Service + company (organisation)</td>
        </tr>
        <tr>
          <td>Staff on a site item</td>
          <td>Staff user</td>
        </tr>
        <tr>
          <td>Scheduled task / staff “today” work</td>
          <td>Job site with site items and staff assigned</td>
        </tr>
        <tr>
          <td>Admin user</td>
          <td>Role(s) (recommended)</td>
        </tr>
        <tr>
          <td>Delete company</td>
          <td>Zero customers and zero job sites using that company</td>
        </tr>
      </tbody>
    </table>

    <h2 id="example">Example first day</h2>
    <ol>
      <li>Create roles (Administrator, Supervisor).</li>
      <li>Create Services (Cleaning, Grounds).</li>
      <li>Create companies (e.g. council names).</li>
      <li>Create admin and staff users.</li>
      <li>Create customer users (one per contact, same company if needed).</li>
      <li>
        Create a job site; add site items (Service + company + staff per line).
      </li>
      <li>Add report templates and schedule tasks if you use them.</li>
    </ol>

    <h2 id="mistakes">Common mistakes</h2>
    <div className="help-warning">
      <ul>
        <li>
          <strong>Customer without a company</strong> — pick or create a company first.
        </li>
        <li>
          <strong>Empty job site</strong> — a site with no site items has no Service/customer/staff
          links; staff will not be tied to it.
        </li>
        <li>
          <strong>Company vs customer person</strong> — site lines use the organisation (company),
          not only a person’s name.
        </li>
        <li>
          <strong>Staff with no work</strong> — assign staff on site items, then create or schedule
          tasks.
        </li>
        <li>
          <strong>Deleting a company</strong> — only when no customers and no job sites still use it.
        </li>
      </ul>
    </div>

    <h2 id="day-to-day">Day-to-day admin</h2>
    <table className="help-table">
      <thead>
        <tr>
          <th>Task</th>
          <th>Menu</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Email / chat</td>
          <td>
            <NavLink to="/messages">Messages</NavLink>
          </td>
        </tr>
        <tr>
          <td>Support tickets</td>
          <td>
            <NavLink to="/tickets">Tickets</NavLink>
          </td>
        </tr>
        <tr>
          <td>Stamped site photos</td>
          <td>
            <NavLink to="/field-photos">Camera</NavLink>
          </td>
        </tr>
        <tr>
          <td>Today’s tasks / schedule</td>
          <td>
            <NavLink to="/task-today">Field work → Tasks</NavLink>
          </td>
        </tr>
        <tr>
          <td>Team meetings</td>
          <td>
            <NavLink to="/team-meeting">Team meeting</NavLink>
          </td>
        </tr>
        <tr>
          <td>Invoices & consumables</td>
          <td>
            <NavLink to="/invoices">Invoices</NavLink>
            {' · '}
            <NavLink to="/consumables">Consumables</NavLink>
          </td>
        </tr>
        <tr>
          <td>Reports & templates</td>
          <td>
            <NavLink to="/new-reports">Reports</NavLink>
          </td>
        </tr>
        <tr>
          <td>Company details</td>
          <td>
            <NavLink to="/settings">Admin → Organisation</NavLink>
          </td>
        </tr>
      </tbody>
    </table>

    <p>
      Optional: <NavLink to="/groups">Groups</NavLink> and positions (if enabled) for organising
      staff; <NavLink to="/settings">Admin → Organisation</NavLink> for system configuration.
    </p>
  </>
);

/** Staff: field portal — tasks, check-in, camera, reports, training. */
const StaffHowTo: React.FC = () => (
  <>
    <h1>How to use your staff portal</h1>
    <p className="help-intro">
      This guide is for field staff. Use the menu on the left for daily work: messages, camera,
      tasks, check-in, reports, and training. You do not set up companies or job sites — your
      supervisor does that.
    </p>

    <nav className="help-toc" aria-label="On this page">
      <strong>On this page</strong>
      <a href="#start">Start of day</a>
      <a href="#work">Tasks & sites</a>
      <a href="#camera">Camera</a>
      <a href="#reports">Reports</a>
      <a href="#training">Training</a>
      <a href="#messages">Messages</a>
      <a href="#tips">Tips</a>
    </nav>

    <h2 id="start">Start of day</h2>
    <div className="help-phase">
      <ol>
        <li>
          Open <NavLink to="/dashboard">Dashboard</NavLink> for a quick overview.
        </li>
        <li>
          Go to <NavLink to="/site-check-in">Site check-in</NavLink> when you arrive on site
          (location permission may be required).
        </li>
        <li>
          Open <NavLink to="/my-tasks">Tasks</NavLink> — Current list for schedule jobs and
          assigned work (Type: Scheduled or Assigned). Use Completed for finished jobs.
        </li>
      </ol>
    </div>

    <h2 id="work">Field work</h2>
    <table className="help-table">
      <thead>
        <tr>
          <th>Menu</th>
          <th>Use it for</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <NavLink to="/site-check-in">Site check-in</NavLink>
          </td>
          <td>Record that you are on site (Field work — not under Tasks).</td>
        </tr>
        <tr>
          <td>
            <NavLink to="/my-tasks">Tasks</NavLink>
          </td>
          <td>
            Current list: scheduled + assigned. Status is on each row. Switch to Completed for
            finished scheduled jobs.
          </td>
        </tr>
      </tbody>
    </table>

    <h2 id="camera">Camera</h2>
    <p>
      Use <NavLink to="/field-photos">Camera</NavLink> to take stamped site photos (time and
      location). Choose <strong>Use phone camera</strong> to keep the photo on your phone, or{' '}
      <strong>Save in the app</strong> to upload it into ServiceLink.
    </p>

    <h2 id="reports">Reports</h2>
    <p>Under Reports you can open and complete the forms assigned to you:</p>
    <ul>
      <li>
        <NavLink to="/new-reports">New reports</NavLink>
      </li>
      <li>
        <NavLink to="/safety-audits">Safety audits</NavLink>
      </li>
      <li>
        <NavLink to="/report-faults">Report faults</NavLink>
      </li>
      <li>
        <NavLink to="/audit-report">Audit report</NavLink>
      </li>
      <li>
        <NavLink to="/incident-report">Incident report</NavLink>
      </li>
      <li>
        <NavLink to="/ppe-report">PPE report</NavLink>
      </li>
    </ul>

    <h2 id="training">Training</h2>
    <table className="help-table">
      <thead>
        <tr>
          <th>Menu</th>
          <th>Use it for</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <NavLink to="/training">Training</NavLink>
          </td>
          <td>Assigned training modules.</td>
        </tr>
        <tr>
          <td>
            <NavLink to="/my-certificates">My certificates</NavLink>
          </td>
          <td>Certificates you have earned or uploaded.</td>
        </tr>
        <tr>
          <td>
            <NavLink to="/toolbox">Toolbox</NavLink>
          </td>
          <td>Toolbox talks / safety briefings.</td>
        </tr>
        <tr>
          <td>
            <NavLink to="/induction">Induction</NavLink>
          </td>
          <td>Site or company induction.</td>
        </tr>
      </tbody>
    </table>

    <h2 id="messages">Messages</h2>
    <p>
      Use <NavLink to="/messages">Messages</NavLink> to read and reply to emails from the office
      or customers. Keep subject lines clear when you start a new message.
    </p>

    <h2 id="tips">Tips</h2>
    <div className="help-warning">
      <ul>
        <li>
          <strong>No tasks showing</strong> — ask your supervisor to assign you on the job site
          (site item) and schedule work.
        </li>
        <li>
          <strong>Check-in fails</strong> — turn on location, and stand within the site’s check-in
          distance.
        </li>
        <li>
          <strong>Camera stamp</strong> — stay on the in-app camera shutter; do not switch to the
          phone’s file picker if you need a stamped upload.
        </li>
      </ul>
    </div>
  </>
);

/** Customer: client portal — tickets, invoices, consumables, reports, personnel. */
const CustomerHowTo: React.FC = () => (
  <>
    <h1>How to use your customer portal</h1>
    <p className="help-intro">
      This guide is for client users. You can message the team, raise tickets, view invoices and
      consumables, read reports for your sites, and manage your organisation’s personnel. Setup of
      services and job sites is done by ServiceLink admin.
    </p>

    <nav className="help-toc" aria-label="On this page">
      <strong>On this page</strong>
      <a href="#overview">Overview</a>
      <a href="#messages">Messages & tickets</a>
      <a href="#procurement">Invoices & consumables</a>
      <a href="#reports">Reports</a>
      <a href="#personnel">Personnel</a>
      <a href="#tips">Tips</a>
    </nav>

    <h2 id="overview">Overview</h2>
    <p>
      Start at <NavLink to="/dashboard">Dashboard</NavLink> for a summary of recent activity. Use
      the left menu for everything else in your portal.
    </p>

    <h2 id="messages">Messages & tickets</h2>
    <table className="help-table">
      <thead>
        <tr>
          <th>Menu</th>
          <th>Use it for</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <NavLink to="/messages">Messages</NavLink>
          </td>
          <td>Email the ServiceLink team; attach reports or consumable deliveries when needed.</td>
        </tr>
        <tr>
          <td>
            <NavLink to="/tickets">Tickets</NavLink>
          </td>
          <td>
            Raise and track support tickets (Pending / In progress / Completed).
          </td>
        </tr>
      </tbody>
    </table>

    <h2 id="procurement">Invoices & consumables</h2>
    <table className="help-table">
      <thead>
        <tr>
          <th>Menu</th>
          <th>Use it for</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <NavLink to="/invoices">Invoices</NavLink>
          </td>
          <td>View invoices for your organisation.</td>
        </tr>
        <tr>
          <td>
            <NavLink to="/consumables">Consumables</NavLink>
          </td>
          <td>View consumable orders and delivery history for your sites.</td>
        </tr>
      </tbody>
    </table>

    <h2 id="reports">Reports</h2>
    <p>Under Reports you can review work completed at your sites:</p>
    <ul>
      <li>
        <NavLink to="/new-reports">New reports</NavLink>
      </li>
      <li>
        <NavLink to="/report-faults">Report faults</NavLink>
      </li>
      <li>
        <NavLink to="/audit-report">Audit report</NavLink>
      </li>
      <li>
        <NavLink to="/monthly-report">Monthly report</NavLink>
      </li>
    </ul>

    <h2 id="personnel">Personnel</h2>
    <p>
      Use <NavLink to="/customer-personnel">Personnel</NavLink> to see people linked to your
      organisation. Contact ServiceLink admin if you need a new customer login created.
    </p>

    <h2 id="tips">Tips</h2>
    <div className="help-warning">
      <ul>
        <li>
          <strong>Missing sites or reports</strong> — only sites linked to your company appear.
          Ask admin if something is missing.
        </li>
        <li>
          <strong>Tickets</strong> — use tickets for issues that need tracking; use messages for
          quick questions.
        </li>
        <li>
          <strong>New logins</strong> — customer accounts are created by admin under Directory →
          Customers (you cannot create admin or staff users).
        </li>
      </ul>
    </div>
  </>
);

const HowToPage: React.FC = () => {
  const type = useMemo(() => readProfileType(), []);

  const body =
    type === userType.STAFF ? (
      <StaffHowTo />
    ) : type === userType.CUSTOMER ? (
      <CustomerHowTo />
    ) : (
      <AdminHowTo />
    );

  return (
    <Layout title="">
      <UsersDiv>
        <HelpPageWrap data-help-role={type}>{body}</HelpPageWrap>
      </UsersDiv>
    </Layout>
  );
};

export default HowToPage;
