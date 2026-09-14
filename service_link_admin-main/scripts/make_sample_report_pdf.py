from pathlib import Path
from shutil import copy2

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

out = Path(r"C:\app_pc\service_link_admin-main\public\images\marketing\sample-roof-gutter-report.pdf")
out.parent.mkdir(parents=True, exist_ok=True)

green = HexColor("#0f5c3f")
muted = HexColor("#4d6359")
line = HexColor("#d5e3db")
bg = HexColor("#f3f7f5")

doc = SimpleDocTemplate(
    str(out),
    pagesize=A4,
    leftMargin=18 * mm,
    rightMargin=18 * mm,
    topMargin=16 * mm,
    bottomMargin=16 * mm,
    title="Roof and Gutter cleaning report — Tonbridge Reserve",
    author="ServiceLink / Service360",
)

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Brand", fontName="Helvetica-Bold", fontSize=16, textColor=green, spaceAfter=2))
styles.add(ParagraphStyle(name="Tag", fontName="Helvetica", fontSize=8, textColor=muted, spaceAfter=10))
styles.add(
    ParagraphStyle(
        name="H1",
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=HexColor("#0f241c"),
        spaceAfter=8,
    )
)
styles.add(ParagraphStyle(name="Meta", fontName="Helvetica", fontSize=9, textColor=muted, spaceAfter=4))
styles.add(
    ParagraphStyle(
        name="Section",
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=green,
        spaceBefore=12,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="Body",
        fontName="Helvetica",
        fontSize=10,
        textColor=HexColor("#0f241c"),
        leading=14,
        spaceAfter=6,
    )
)
styles.add(ParagraphStyle(name="Small", fontName="Helvetica", fontSize=8, textColor=muted, alignment=TA_CENTER))
styles.add(
    ParagraphStyle(name="Cell", fontName="Helvetica", fontSize=9, textColor=HexColor("#0f241c"), leading=12)
)
styles.add(ParagraphStyle(name="CellHead", fontName="Helvetica-Bold", fontSize=9, textColor=white, leading=12))

story = []
story.append(Paragraph("SERVICELINK", styles["Brand"]))
story.append(Paragraph("YOUR PARTNER IN FACILITIES · Service360 Report", styles["Tag"]))
story.append(HRFlowable(width="100%", thickness=2, color=green, spaceAfter=10))
story.append(Paragraph("Roof and Gutter cleaning report", styles["H1"]))
story.append(Paragraph("Sample completed site report for client New reports", styles["Meta"]))

meta = [
    [
        Paragraph("<b>Report ID</b>", styles["Cell"]),
        Paragraph("NR-2026-0908-0142", styles["Cell"]),
        Paragraph("<b>Status</b>", styles["Cell"]),
        Paragraph("Completed", styles["Cell"]),
    ],
    [
        Paragraph("<b>Date</b>", styles["Cell"]),
        Paragraph("08/09/2026 11:40", styles["Cell"]),
        Paragraph("<b>Template</b>", styles["Cell"]),
        Paragraph("New Report", styles["Cell"]),
    ],
    [
        Paragraph("<b>Client</b>", styles["Cell"]),
        Paragraph("Bayside Council", styles["Cell"]),
        Paragraph("<b>Site</b>", styles["Cell"]),
        Paragraph("Tonbridge Reserve", styles["Cell"]),
    ],
    [
        Paragraph("<b>Service</b>", styles["Cell"]),
        Paragraph("Reactive/Adhoc Maintenance Works", styles["Cell"]),
        Paragraph("<b>Submitted by</b>", styles["Cell"]),
        Paragraph("Field Staff", styles["Cell"]),
    ],
]
t = Table(meta, colWidths=[28 * mm, 55 * mm, 28 * mm, 55 * mm])
t.setStyle(
    TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BOX", (0, 0), (-1, -1), 0.6, line),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, line),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]
    )
)
story.append(t)

story.append(Paragraph("Work summary", styles["Section"]))
story.append(
    Paragraph(
        "Roof and gutter cleaning completed at Tonbridge Reserve. Gutters were cleared of leaves and silt, "
        "downpipes were checked and flushed, and roof debris was removed from accessible areas. "
        "Site left tidy with no standing water observed at the entry path.",
        styles["Body"],
    )
)

story.append(Paragraph("Checklist", styles["Section"]))
checks = [
    [
        Paragraph("<b>Item</b>", styles["CellHead"]),
        Paragraph("<b>Result</b>", styles["CellHead"]),
        Paragraph("<b>Notes</b>", styles["CellHead"]),
    ],
    [
        Paragraph("Gutter clear-out", styles["Cell"]),
        Paragraph("Complete", styles["Cell"]),
        Paragraph("Leaves and silt removed along full run", styles["Cell"]),
    ],
    [
        Paragraph("Downpipe flush", styles["Cell"]),
        Paragraph("Complete", styles["Cell"]),
        Paragraph("Flow restored; no blockage remaining", styles["Cell"]),
    ],
    [
        Paragraph("Roof debris removal", styles["Cell"]),
        Paragraph("Complete", styles["Cell"]),
        Paragraph("Loose debris cleared from accessible roof edge", styles["Cell"]),
    ],
    [
        Paragraph("Overflow / pooling check", styles["Cell"]),
        Paragraph("Pass", styles["Cell"]),
        Paragraph("No pooling near entry after clean", styles["Cell"]),
    ],
    [
        Paragraph("Photo evidence", styles["Cell"]),
        Paragraph("Attached", styles["Cell"]),
        Paragraph("Before/after site photos on file", styles["Cell"]),
    ],
]
ct = Table(checks, colWidths=[50 * mm, 30 * mm, 86 * mm])
ct.setStyle(
    TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), green),
            ("BACKGROUND", (0, 1), (-1, -1), white),
            ("BOX", (0, 0), (-1, -1), 0.6, line),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, line),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, bg]),
        ]
    )
)
story.append(ct)

story.append(Paragraph("Materials / notes", styles["Section"]))
story.append(
    Paragraph(
        "No replacement parts required. Recommend seasonal inspection before next storm season. "
        "This PDF is a sample marketing document mirroring a completed New Report download for client review.",
        styles["Body"],
    )
)

story.append(Spacer(1, 14))
story.append(HRFlowable(width="100%", thickness=1, color=line, spaceAfter=8))
story.append(Paragraph("Service360 · Confidential sample for feature highlights · 08/09/2026", styles["Small"]))

doc.build(story)
copy2(out, Path(r"C:\app_pc\App Highlight\sample-roof-gutter-report.pdf"))
print("Wrote", out, out.stat().st_size)
