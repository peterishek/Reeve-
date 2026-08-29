from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.pdfgen import canvas

# Optional: Register TrueType fonts to match your exact web app fonts
# from reportlab.pdfgen.canvas import Canvas
# from reportlab.pdfbase import pdfmetrics
# from reportlab.pdfbase.ttfonts import TTFont
# pdfmetrics.registerFont(TTFont('SerifFont', 'path/to/PlayfairDisplay-Bold.ttf'))
# pdfmetrics.registerFont(TTFont('SansFont', 'path/to/Inter-Regular.ttf'))

# Reeve's palette matching your dashboard screenshot
INK = colors.HexColor("#12182B")
SLATE = colors.HexColor("#5C6478")
PAPER = colors.HexColor("#F0EEE6")
PAPER_DEEP = colors.HexColor("#E7E4D8")
EMERALD = colors.HexColor("#1B8A5A")

# Font constants (Fallbacks using ReportLab's core standard fonts)
FONT_SERIF_BOLD = "Times-Bold"      # Used for Logo, Headers, & Balances
FONT_SANS = "Helvetica"            # Used for UI text, labels, metadata
FONT_SANS_BOLD = "Helvetica-Bold"  # Used for table headers & emphasized values


def _styles():
    styles = getSampleStyleSheet()
    
    # Brand logo using Serif style from the app
    styles.add(ParagraphStyle(
        "ReeveLogo", 
        fontName=FONT_SERIF_BOLD, 
        fontSize=24, 
        leading=28, 
        textColor=INK
    ))
    
    # Metadata text in clean Sans-Serif
    styles.add(ParagraphStyle(
        "MetaRight", 
        fontName=FONT_SANS, 
        fontSize=8.5, 
        textColor=SLATE, 
        alignment=TA_RIGHT, 
        leading=12
    ))
    
    # Summary Card typography
    styles.add(ParagraphStyle(
        "SummaryLabel", 
        fontName=FONT_SANS_BOLD, 
        fontSize=7.5, 
        textColor=SLATE, 
        alignment=TA_CENTER, 
        leading=9
    ))
    styles.add(ParagraphStyle(
        "SummaryValueSerif", 
        fontName=FONT_SERIF_BOLD, 
        fontSize=13, 
        textColor=INK, 
        alignment=TA_CENTER, 
        leading=16
    ))
    styles.add(ParagraphStyle(
        "SummaryValueSans", 
        fontName=FONT_SANS_BOLD, 
        fontSize=11, 
        textColor=INK, 
        alignment=TA_CENTER, 
        leading=14
    ))
    
    # Table typography
    styles.add(ParagraphStyle("TableHeader", fontName=FONT_SANS_BOLD, fontSize=7.5, textColor=SLATE, leading=9))
    styles.add(ParagraphStyle("TableHeaderRight", fontName=FONT_SANS_BOLD, fontSize=7.5, textColor=SLATE, alignment=TA_RIGHT, leading=9))
    
    styles.add(ParagraphStyle("TableCell", fontName=FONT_SANS, fontSize=8.5, textColor=INK, leading=11))
    styles.add(ParagraphStyle("TableCellMuted", fontName=FONT_SANS, fontSize=8.5, textColor=SLATE, leading=11))
    styles.add(ParagraphStyle("TableCellBold", fontName=FONT_SANS_BOLD, fontSize=8.5, textColor=INK, leading=11))
    styles.add(ParagraphStyle("TableCellCredit", fontName=FONT_SANS_BOLD, fontSize=8.5, textColor=EMERALD, leading=11))
    
    styles.add(ParagraphStyle("TableCellRight", fontName=FONT_SANS, fontSize=8.5, textColor=INK, alignment=TA_RIGHT, leading=11))
    styles.add(ParagraphStyle("TableCellRightSerif", fontName=FONT_SERIF_BOLD, fontSize=9, textColor=INK, alignment=TA_RIGHT, leading=11))
    styles.add(ParagraphStyle("TableCellRightCreditSerif", fontName=FONT_SERIF_BOLD, fontSize=9, textColor=EMERALD, alignment=TA_RIGHT, leading=11))
    
    styles.add(ParagraphStyle("TableEmpty", fontName=FONT_SANS, fontSize=8.5, textColor=SLATE, alignment=TA_CENTER, leading=11))
    styles.add(ParagraphStyle("Footer", fontName=FONT_SANS, fontSize=7.5, textColor=SLATE, alignment=TA_CENTER, leading=10))
    
    return styles


def _draw_footer(canvas, doc):
    canvas.saveState()
    footer_text = (
        "Reeve Bank • This statement is system-generated and does not require a signature.<br/>"
        "Fictional bank, portfolio project only."
    )
    styles = _styles()
    p = Paragraph(footer_text, styles["Footer"])
    w, h = p.wrap(doc.width, doc.bottomMargin)
    p.drawOn(canvas, doc.leftMargin, doc.bottomMargin - 1 * cm)
    canvas.restoreState()


def generate_statement_pdf(account, user, entries, statement_currency, generated_at, period_from, period_to):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4,
        topMargin=1.5 * cm, 
        bottomMargin=2.0 * cm, 
        leftMargin=1.5 * cm, 
        rightMargin=1.5 * cm,
    )
    styles = _styles()
    story = []

    PRINTABLE_WIDTH = 18.0 * cm

    # Header
    holder_name = user.get_full_name() or user.username
    meta_text = (
        f"Generated: <b>{generated_at.strftime('%d %b %Y, %H:%M')}</b><br/>"
        f"Account: <b>{account.get_account_type_display()}</b> — Currency: <b>{statement_currency}</b><br/>"
        f"Holder: <b>{holder_name}</b>"
    )
    header_table = Table(
        [[Paragraph("Reeve", styles["ReeveLogo"]), Paragraph(meta_text, styles["MetaRight"])]],
        colWidths=[6.0 * cm, 12.0 * cm],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LINEBELOW", (0, 0), (-1, 0), 1.5, INK),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 14))

    # Summary Box (Mixes Sans labels with Serif financial numbers)
    period_text = f"{period_from.strftime('%d %b %Y')} – {period_to.strftime('%d %b %Y')}" if period_from else "No entries"
    summary_data = [
        [
            Paragraph("STATEMENT PERIOD", styles["SummaryLabel"]), 
            Paragraph("CURRENCY", styles["SummaryLabel"]), 
            Paragraph("CURRENT BALANCE", styles["SummaryLabel"])
        ],
        [
            Paragraph(period_text, styles["SummaryValueSans"]), 
            Paragraph(statement_currency, styles["SummaryValueSans"]),
            Paragraph(f"{account.currency} {account.balance}", styles["SummaryValueSerif"])
        ],
    ]
    col_w = PRINTABLE_WIDTH / 3.0
    summary_table = Table(summary_data, colWidths=[col_w, col_w, col_w])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEAFTER", (0, 0), (1, -1), 0.5, PAPER_DEEP),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 16))

    # Transactions Table
    col_widths = [3.2 * cm, 6.3 * cm, 2.0 * cm, 3.2 * cm, 3.3 * cm]
    headers = [
        Paragraph("DATE & TIME", styles["TableHeader"]),
        Paragraph("DESCRIPTION", styles["TableHeader"]),
        Paragraph("TYPE", styles["TableHeader"]),
        Paragraph("AMOUNT", styles["TableHeaderRight"]),
        Paragraph("ENDING BALANCE", styles["TableHeaderRight"]),
    ]
    
    table_data = [headers]
    entries = list(entries)

    if not entries:
        table_data.append([
            Paragraph("No transactions recorded for this period/currency.", styles["TableEmpty"]),
            "", "", "", ""
        ])
    else:
        for e in entries:
            is_credit = (e.direction == "credit")
            amount_style = styles["TableCellRightCreditSerif"] if is_credit else styles["TableCellRightSerif"]
            type_style = styles["TableCellCredit"] if is_credit else styles["TableCellBold"]
            description = getattr(e, "description", None) or getattr(getattr(e, "transaction", None), "description", "Transfer")

            table_data.append([
                Paragraph(e.created_at.strftime("%d %b %Y, %H:%M"), styles["TableCellMuted"]),
                Paragraph(description, styles["TableCell"]),
                Paragraph(e.direction.title(), type_style),
                Paragraph(f"{e.currency} {e.amount}", amount_style),
                Paragraph(f"{e.currency} {e.balance_after}", styles["TableCellRight"]),
            ])

    txn_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table_styles = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, 0), 1.25, INK),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]

    if not entries:
        table_styles.append(("SPAN", (0, 1), (-1, 1)))
    else:
        for i in range(1, len(table_data)):
            if i % 2 == 0:
                table_styles.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#FAFAFA")))
            table_styles.append(("LINEBELOW", (0, i), (-1, i), 0.5, PAPER))

    txn_table.setStyle(TableStyle(table_styles))
    story.append(txn_table)

    doc.build(story, onFirstPage=_draw_footer, onLaterPages=_draw_footer)
    return buffer.getvalue()