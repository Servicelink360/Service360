import Layout from '@app/components/layout/Layout';
import { UsersDiv } from '@app/components/common/container.style';
import React from 'react';
import { Link } from 'react-router-dom';
import { HelpPageWrap } from './how-to.styles';

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="help-nav-link">
    {children}
  </Link>
);

const HowToPage: React.FC = () => (
  <Layout title="">
    <UsersDiv>
      <HelpPageWrap>
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
              <NavLink to="/roles">Master data → Roles</NavLink>
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
              <strong>Admin users</strong> — <NavLink to="/admins">System → Admins → New</NavLink>.
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
              <NavLink to="/report-templates">Master data → Report templates</NavLink>
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
                <NavLink to="/admins">System → Admins</NavLink>
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
                <NavLink to="/roles">Master data → Roles</NavLink>
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

        <p>
          Optional: <NavLink to="/groups">Groups</NavLink> and positions (if enabled) for organising
          staff; <NavLink to="/settings">System → Settings</NavLink> for system configuration.
        </p>
      </HelpPageWrap>
    </UsersDiv>
  </Layout>
);

export default HowToPage;
