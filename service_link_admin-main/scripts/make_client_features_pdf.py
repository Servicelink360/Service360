"""Build Client features marketing PDF with screenshots."""
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    HRFlowable,
)

ROOT = Path(r"C:\app_pc\service_link_admin-main")
IMG = ROOT / "public" / "images" / "marketing"
OUT = IMG / "client-features-guide.pdf"
APP_HL = Path(r"C:\app_pc\App Highlight") / "client-features-guide.pdf"

GREEN = HexColor("#0f5c3f")
ACCENT = HexColor("#147a54")
INK = HexColor("#0f241c")
MUTED = HexColor("#4d6359")
LINE = HexColor("#d5e3db")
BG = HexColor("#f3f7f5")

SAMPLE_REPORT = (
    "https://service360basket.s3.ap-southeast-2.amazonaws.com/report_1788606566517.pdf"
)


def styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle(name="Brand", fontName="Helvetica-Bold", fontSize=18, textColor=GREEN, spaceAfter=2))
    s.add(ParagraphStyle(name="Tag", fontName="Helvetica", fontSize=8, textColor=MUTED, spaceAfter=8))
    s.add(ParagraphStyle(name="DocTitle", fontName="Helvetica-Bold", fontSize=22, textColor=INK, spaceAfter=6, leading=26))
    s.add(ParagraphStyle(name="Lead", fontName="Helvetica", fontSize=11, textColor=MUTED, leading=15, spaceAfter=14))
    s.add(ParagraphStyle(name="FeatTitle", fontName="Helvetica-Bold", fontSize=14, textColor=GREEN, spaceBefore=4, spaceAfter=4))
    s.add(ParagraphStyle(name="ChildTitle", fontName="Helvetica-Bold", fontSize=11, textColor=INK, spaceBefore=8, spaceAfter=3))
    s.add(ParagraphStyle(name="Body", fontName="Helvetica", fontSize=9.5, textColor=INK, leading=13, spaceAfter=6))
    s.add(ParagraphStyle(name="BulletText", fontName="Helvetica", fontSize=9, textColor=MUTED, leading=12))
    s.add(ParagraphStyle(name="Caption", fontName="Helvetica-Oblique", fontSize=8, textColor=MUTED, spaceBefore=3, spaceAfter=8))
    s.add(ParagraphStyle(name="Link", fontName="Helvetica-Bold", fontSize=9, textColor=ACCENT, spaceAfter=8))
    s.add(ParagraphStyle(name="Footer", fontName="Helvetica", fontSize=8, textColor=MUTED, alignment=TA_CENTER))
    s.add(ParagraphStyle(name="Eyebrow", fontName="Helvetica-Bold", fontSize=8, textColor=ACCENT, spaceAfter=4))
    return s


def img_block(path: Path, caption: str, st, max_w=170 * mm, max_h=95 * mm):
    if not path.exists():
        return [Paragraph(f"[Missing image: {path.name}]", st["Caption"])]
    flow = []
    im = Image(str(path))
    iw, ih = im.imageWidth, im.imageHeight
    scale = min(max_w / iw, max_h / ih, 1.0)
    im.drawWidth = iw * scale
    im.drawHeight = ih * scale
    flow.append(im)
    if caption:
        flow.append(Paragraph(caption, st["Caption"]))
    return flow


def bullets(items, st):
    return ListFlowable(
        [ListItem(Paragraph(b, st["BulletText"]), leftIndent=8, bulletColor=ACCENT) for b in items],
        bulletType="bullet",
        start="•",
        leftIndent=12,
        spaceBefore=2,
        spaceAfter=8,
    )


def feature_blocks(st):
    blocks = []

    sections = [
        {
            "title": "Dashboard",
            "text": "After sign-in you land here. Badges show what needs attention for your organisation only.",
            "bullets": [
                "New reports, fault reports, tickets, messages, and invoices with live counts",
                "Tap a tile to open that module",
                "Invoices badge clears after you open Invoices",
            ],
            "image": IMG / "client-dashboard.png",
            "caption": "Client dashboard with Reports and Invoices quick links",
        },
        {
            "title": "Messages",
            "text": "Threaded inbox to talk with your service provider (ServiceLink) or colleagues in your organisation.",
            "bullets": [
                "Tabs: All, Received, Sent, and Deleted",
                "Start a conversation with one recipient, then send text and attachments",
                "Cc colleagues on provider threads or report-linked chats",
                "Open a chat from a fault or new report (“message about this report”) — replies stay linked to that record",
            ],
            "image": IMG / "client-messages.png",
            "caption": "Client messages inbox with conversation list and compose form",
        },
        {
            "title": "Tickets",
            "text": "Raise and track service requests for your sites. Support moves each ticket through status; you reply when it’s your turn.",
            "bullets": [
                "Create from Ticket New: site, service, subject, message, optional Urgent, and required media",
                "Edit, delete, or restore your own tickets",
            ],
            "image": IMG / "client-tickets.png",
            "caption": "Client tickets list with New, In progress, and Completed views",
            "children": [
                ("Ticket New", "Newly submitted requests waiting for support. This is where clients create a ticket."),
                ("Ticket In progress", "Support is working the ticket. Status shows Waiting for customer or Waiting for support."),
                ("Ticket Completed", "Closed tickets with full history. No further replies."),
            ],
        },
        {
            "title": "My personnel",
            "text": "Your organisation’s contact list — people who can receive fault work when you delegate.",
            "bullets": [
                "Add, edit, or remove contacts (name, email, phone, type such as Tradesperson or Electrician)",
                "Used when delegating a fault by email with a secure link",
            ],
            "image": IMG / "client-my-personnel.png",
            "caption": "My personnel list with name, email, phone, type, and actions",
        },
        {
            "title": "Invoices",
            "text": "View and download invoices published for your organisation. Clients do not upload invoices — admins publish them.",
            "bullets": [
                "Search and filter by date",
                "Open details and download attachments",
                "Soft-delete or restore from the Deleted tab",
            ],
            "image": IMG / "client-invoices.png",
            "caption": "Client invoices list with sample invoice PDF and download actions",
        },
    ]

    for sec in sections:
        parts = [
            Paragraph(sec["title"], st["FeatTitle"]),
            Paragraph(sec["text"], st["Body"]),
        ]
        if sec.get("bullets"):
            parts.append(bullets(sec["bullets"], st))
        parts.extend(img_block(sec["image"], sec["caption"], st))
        for ct, cx in sec.get("children") or []:
            parts.append(Paragraph(ct, st["ChildTitle"]))
            parts.append(Paragraph(cx, st["Body"]))
        parts.append(HRFlowable(width="100%", thickness=0.6, color=LINE, spaceBefore=4, spaceAfter=10))
        blocks.append(KeepTogether(parts))

    # Reports section
    reports_intro = [
        Paragraph("Reports", st["FeatTitle"]),
        Paragraph(
            "All site reporting for your portfolio — completed work, faults you manage, audits, and adhoc / reactive jobs.",
            st["Body"],
        ),
    ]
    blocks.append(KeepTogether(reports_intro))

    report_children = [
        {
            "title": "New reports",
            "text": (
                "History of template-based site reports created by staff or admin (clients cannot create here). "
                "Filter by date or site, open a report, download PDF, message about it, and track read status. "
                "Sample: Roof and Gutter cleaning report at Tonbridge Reserve."
            ),
            "image": IMG / "client-new-reports.png",
            "caption": "New report detail — Roof and Gutter cleaning report sample",
            "link": SAMPLE_REPORT,
            "link_label": "View report sample",
            "extra_images": [
                (IMG / "report1.png", "Roof and Gutter Cleaning Report modal with before and after photos"),
                (IMG / "report2.png", "Roof and Gutter cleaning report photo viewer with site location stamp"),
            ],
        },
        {
            "title": "Adhoc reports",
            "text": (
                "Reactive / ad hoc maintenance filed by staff (Adhoc Report template, including “Other” custom sites). "
                "Finished adhoc jobs appear under New reports for your sites. Sample: emergency gutter unblock after storm."
            ),
            "image": IMG / "client-adhoc-report.png",
            "caption": "Adhoc report sample for reactive roof and gutter work",
        },
        {
            "title": "Report faults",
            "text": (
                "Review and manage faults logged by staff (clients do not create faults). Set priority, message support, "
                "mark completed or reopen, and delegate to ServiceLink or My personnel via email + secure link. "
                "Sample: Roof and Gutter fault — blocked gutter overflowing."
            ),
            "image": IMG / "client-report-faults.png",
            "caption": "Report faults list with Roof and Gutter urgent fault sample",
            "extra_images": [
                (IMG / "fault.png", "Fault media — overhanging branches over corrugated roof"),
                (IMG / "fault1.png", "Fault Report modal — Blackmore Oval Roof and Gutter Cleaning with media files"),
            ],
        },
        {
            "title": "Audit report",
            "text": (
                "Month / site / service view of completed scheduled field tasks and their audit PDFs. "
                "Search completed work, open the viewer, and download PDF when available."
            ),
        },
    ]

    for child in report_children:
        parts = [
            Paragraph(child["title"], st["ChildTitle"]),
            Paragraph(child["text"], st["Body"]),
        ]
        if child.get("link"):
            parts.append(
                Paragraph(
                    f'<link href="{child["link"]}" color="#147a54"><u>{child["link_label"]}</u></link>',
                    st["Link"],
                )
            )
        if child.get("image"):
            parts.extend(img_block(child["image"], child.get("caption", ""), st))
        for extra_path, extra_cap in child.get("extra_images") or []:
            parts.extend(img_block(extra_path, extra_cap, st, max_h=80 * mm))
        parts.append(Spacer(1, 6))
        # Don't KeepTogether large image stacks — allow page breaks
        blocks.extend(parts)

    return blocks


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    st = styles()
    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title="Service360 Client features",
        author="ServiceLink / Service360",
    )

    story = [
        Paragraph("SERVICELINK", st["Brand"]),
        Paragraph("YOUR PARTNER IN FACILITIES · Service360", st["Tag"]),
        HRFlowable(width="100%", thickness=2, color=GREEN, spaceAfter=10),
        Paragraph("CLIENT WORKSPACE", st["Eyebrow"]),
        Paragraph("Client features", st["DocTitle"]),
        Paragraph("Everything in the live client sidebar after sign-in.", st["Lead"]),
    ]
    story.extend(feature_blocks(st))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=LINE, spaceAfter=8))
    story.append(
        Paragraph(
            "Service360 · Client features guide · Generated for feature highlights marketing",
            st["Footer"],
        )
    )

    doc.build(story)
    APP_HL.write_bytes(OUT.read_bytes())
    print("Wrote", OUT, OUT.stat().st_size)
    print("Copied", APP_HL)


if __name__ == "__main__":
    main()
