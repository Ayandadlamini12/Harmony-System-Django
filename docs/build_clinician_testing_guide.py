from __future__ import annotations

from pathlib import Path
from textwrap import wrap

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "clinician-system-testing-guide.pdf"
LOGO = ROOT / "frontend" / "public" / "brand" / "harmony-logo.png"

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
PURPLE = colors.HexColor("#6f2da8")
PURPLE_DARK = colors.HexColor("#35104f")
LILAC = colors.HexColor("#f4ecfb")
GREEN = colors.HexColor("#53b86a")
GREEN_DARK = colors.HexColor("#19733a")
INK = colors.HexColor("#15211d")
MUTED = colors.HexColor("#5f6f68")
BORDER = colors.HexColor("#cddbd4")
BG = colors.HexColor("#f7faf8")
AMBER = colors.HexColor("#f59e0b")
RED = colors.HexColor("#dc2626")


body_style = ParagraphStyle(
    "Body",
    fontName="Helvetica",
    fontSize=9.5,
    leading=13.2,
    textColor=INK,
)


def draw_wrapped(c: canvas.Canvas, text: str, x: float, y: float, width: float, size=9.5, leading=13, color=INK, font="Helvetica"):
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            c.drawString(x, y, line)
            y -= leading
            line = word
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


def paragraph(c: canvas.Canvas, text: str, x: float, y: float, width: float, height: float, style=body_style):
    p = Paragraph(text, style)
    _, h = p.wrap(width, height)
    p.drawOn(c, x, y - h)
    return y - h


def header(c: canvas.Canvas, title: str, subtitle: str = ""):
    c.setFillColor(colors.white)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(PURPLE)
    c.rect(0, PAGE_H - 23 * mm, PAGE_W, 23 * mm, fill=1, stroke=0)
    if LOGO.exists():
        c.drawImage(str(LOGO), MARGIN, PAGE_H - 19 * mm, 17 * mm, 17 * mm, preserveAspectRatio=True, mask="auto")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(MARGIN + 21 * mm, PAGE_H - 11 * mm, "Harmony Health MIS")
    c.setFont("Helvetica", 8.5)
    c.drawString(MARGIN + 21 * mm, PAGE_H - 16 * mm, "Clinician testing guide")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 19)
    c.drawString(MARGIN, PAGE_H - 38 * mm, title)
    if subtitle:
        draw_wrapped(c, subtitle, MARGIN, PAGE_H - 45 * mm, PAGE_W - 2 * MARGIN, size=9.5, leading=11, color=MUTED)


def footer(c: canvas.Canvas, page: int):
    c.setStrokeColor(BORDER)
    c.line(MARGIN, 13 * mm, PAGE_W - MARGIN, 13 * mm)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, 8 * mm, "Harmony Health MIS testing guide - pre-Keycloak clinician validation")
    c.drawRightString(PAGE_W - MARGIN, 8 * mm, f"Page {page}")


def rounded_card(c, x, y, w, h, title, body="", fill=colors.white, stroke=BORDER, title_color=PURPLE_DARK):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.roundRect(x, y - h, w, h, 5 * mm, fill=1, stroke=1)
    c.setFillColor(title_color)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 5 * mm, y - 8 * mm, title)
    if body:
        draw_wrapped(c, body, x + 5 * mm, y - 15 * mm, w - 10 * mm, size=8.7, leading=11.5, color=MUTED)


def pill(c, x, y, text, fill, fg=colors.white):
    c.setFont("Helvetica-Bold", 8)
    width = stringWidth(text, "Helvetica-Bold", 8) + 8 * mm
    c.setFillColor(fill)
    c.roundRect(x, y - 6 * mm, width, 7 * mm, 3.5 * mm, fill=1, stroke=0)
    c.setFillColor(fg)
    c.drawCentredString(x + width / 2, y - 4 * mm, text)
    return width


def numbered_step(c, number, title, body, x, y, w, accent=PURPLE):
    c.setFillColor(LILAC)
    c.setStrokeColor(BORDER)
    c.roundRect(x, y - 28 * mm, w, 28 * mm, 4 * mm, fill=1, stroke=1)
    c.setFillColor(accent)
    c.circle(x + 8 * mm, y - 9 * mm, 4.5 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawCentredString(x + 8 * mm, y - 12 * mm, str(number))
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 16 * mm, y - 7 * mm, title)
    draw_wrapped(c, body, x + 16 * mm, y - 13 * mm, w - 20 * mm, size=8.2, leading=10.5, color=MUTED)


def workflow(c):
    x = MARGIN
    y = PAGE_H - 112 * mm
    items = [
        ("Login", "Old clinician credentials"),
        ("Find / register patient", "Patient list or registration"),
        ("Check-in / queue", "Reception or clinician test"),
        ("Clinical pre-checks", "Consent, history, confidential review, vitals"),
        ("New visit", "Consultation record"),
        ("Follow-up", "Review symptoms and remedy response"),
    ]
    box_w = (PAGE_W - 2 * MARGIN - 10 * mm) / 3
    box_h = 25 * mm
    for i, (title, body) in enumerate(items):
        col = i % 3
        row = i // 3
        bx = x + col * (box_w + 5 * mm)
        by = y - row * (box_h + 12 * mm)
        rounded_card(c, bx, by, box_w, box_h, title, body, fill=colors.white)
        if i not in (2, 5):
            c.setStrokeColor(PURPLE)
            c.setLineWidth(1.2)
            c.line(bx + box_w, by - box_h / 2, bx + box_w + 4 * mm, by - box_h / 2)
            c.setFillColor(PURPLE)
            c.circle(bx + box_w + 4 * mm, by - box_h / 2, 1.3 * mm, fill=1, stroke=0)


def page_cover(c):
    header(c, "Clinician System Testing Guide", "Use this guide before Keycloak is connected.")
    if LOGO.exists():
        c.drawImage(str(LOGO), PAGE_W - MARGIN - 47 * mm, PAGE_H - 78 * mm, 45 * mm, 45 * mm, preserveAspectRatio=True, mask="auto")
    pill(c, MARGIN, PAGE_H - 54 * mm, "PRE-KEYCLOAK TESTING", PURPLE)
    pill(c, MARGIN + 42 * mm, PAGE_H - 54 * mm, "CLINICIAN WORKFLOW", GREEN)
    rounded_card(
        c,
        MARGIN,
        PAGE_H - 68 * mm,
        105 * mm,
        35 * mm,
        "Purpose",
        "This guide helps clinicians validate the current Harmony Health MIS workflow before centralized Keycloak login is configured. "
        "Login with existing Harmony MIS credentials. The goal is to test the practical patient sequence: find or register a patient, check them in, capture clinical pre-checks, create a new visit, and record a follow-up.",
        fill=BG,
    )
    workflow(c)
    rounded_card(
        c,
        MARGIN,
        92 * mm,
        PAGE_W - 2 * MARGIN,
        32 * mm,
        "Testing rule",
        "Use test patients only. Do not enter real patient confidential information during validation unless the clinic owner has approved that live-data test.",
        fill=colors.HexColor("#fff7ed"),
        stroke=colors.HexColor("#fed7aa"),
        title_color=colors.HexColor("#9a3412"),
    )
    footer(c, 1)


def page_login(c):
    header(c, "1. Login And Open The Clinician Workspace", "The current login remains active until Keycloak is connected.")
    left = MARGIN
    top = PAGE_H - 56 * mm
    numbered_step(c, 1, "Open the MIS", "Go to https://mis.harmonyhealthsz.com or the local test URL provided by the administrator.", left, top, 75 * mm)
    numbered_step(c, 2, "Sign in", "Use your current Harmony MIS clinician username and password. Do not use the new Keycloak admin account for MIS testing.", left, top - 34 * mm, 75 * mm)
    numbered_step(c, 3, "Confirm role", "After login, confirm that the sidebar shows Clinician dashboard or that clinician patient actions are available.", left, top - 68 * mm, 75 * mm)
    rounded_card(c, 105 * mm, top, 78 * mm, 84 * mm, "What to see", "A purple Harmony top bar, collapsible sidebar, and menu items such as Patients, Visits, Appointments, Messages, Reports, and Settings.", fill=BG)
    rounded_card(c, 105 * mm, top - 92 * mm, 78 * mm, 45 * mm, "If login fails", "Report the exact username used, time of attempt, and any message shown. Do not reset passwords without admin approval.", fill=colors.HexColor("#fef2f2"), stroke=colors.HexColor("#fecaca"), title_color=RED)
    footer(c, 2)


def page_checkin(c):
    header(c, "2. Find Or Check In A Patient", "The check-in interface should identify whether the patient has an appointment or should enter the queue.")
    x = MARGIN
    y = PAGE_H - 55 * mm
    steps = [
        ("Go to Patients", "Open Patients from the sidebar, then use Patient List to find an existing test patient."),
        ("Open Check-In", "Use the Check-In menu item or patient-specific check-in action when available."),
        ("Choose identifier", "Select Cell Number, Patient ID, or National/Passport ID."),
        ("Search and confirm", "Enter the identifier, verify the patient name, then continue."),
        ("Choose visit type", "Select New Visit or Follow Up. The system checks appointments automatically."),
        ("Activate flow", "The patient should appear as checked in or queued, with a queue number for walk-ins."),
    ]
    for i, (title, body) in enumerate(steps, start=1):
        col = (i - 1) % 2
        row = (i - 1) // 2
        numbered_step(c, i, title, body, x + col * 84 * mm, y - row * 35 * mm, 78 * mm, PURPLE if i < 6 else GREEN)
    rounded_card(c, MARGIN, 58 * mm, PAGE_W - 2 * MARGIN, 24 * mm, "Expected result", "Patient process tracking should show the current stage and what needs to happen next. A patient should not be activated twice in the same day.", fill=LILAC)
    footer(c, 3)


def page_new_visit(c):
    header(c, "3. Create A New Visit", "New visit recording should only be available after required patient workflow steps are satisfied.")
    y = PAGE_H - 55 * mm
    rounded_card(c, MARGIN, y, PAGE_W - 2 * MARGIN, 28 * mm, "Before creating the visit", "Confirm the patient has consent completed, is checked in or queued, and has the required clinical pre-checks available. Vitals can be recorded when consent is complete.", fill=BG)
    y -= 42 * mm
    steps = [
        ("Open patient workspace", "From Patient List, open the test patient."),
        ("Use New visit", "Click New visit from the patient action row. Do not use old case routes."),
        ("Visit details", "Confirm patient, visit type, visit date, and visit time."),
        ("Symptoms / problems", "Add each symptom or problem as a separate line item. Each can later be marked resolved or left open."),
        ("Clinical sections", "Complete medical review sections relevant to the patient. Gender-specific fields should not appear for male patients."),
        ("Save visit", "Save and confirm the visit appears under the patient record tabs."),
    ]
    for i, (title, body) in enumerate(steps, start=1):
        numbered_step(c, i, title, body, MARGIN + ((i - 1) % 2) * 84 * mm, y - ((i - 1) // 2) * 34 * mm, 78 * mm)
    footer(c, 4)


def page_followup(c):
    header(c, "4. Create A Follow-Up Visit", "Follow-up should reuse the previous complaint context without exposing previous diagnosis/remedy by default.")
    y = PAGE_H - 55 * mm
    rounded_card(c, MARGIN, y, PAGE_W - 2 * MARGIN, 30 * mm, "Follow-up logic to verify", "The previous complaint/symptom context should be visible. Previous diagnosis, remedy, and recommendations should stay hidden until the clinician uses the view/eye action.", fill=colors.HexColor("#eef9f0"), stroke=colors.HexColor("#bbf7d0"), title_color=GREEN_DARK)
    y -= 43 * mm
    steps = [
        ("Find the patient", "Open the same patient used for the new visit test."),
        ("Create follow-up", "Use Follow-up or Add Visit with visit type Follow up."),
        ("Review symptoms", "Open symptoms/problems from the previous visit. Mark resolved items with a tick and leave unresolved items open."),
        ("Add new symptoms", "Add any new problem as a separate item with its own note."),
        ("Record evaluation", "Complete follow-up evaluation fields: previous consult symptoms, dietary changes, lifestyle/exercise, energy, and evaluation notes."),
        ("Save and verify", "Confirm patient history shows both original visit and follow-up records in order."),
    ]
    for i, (title, body) in enumerate(steps, start=1):
        numbered_step(c, i, title, body, MARGIN + ((i - 1) % 2) * 84 * mm, y - ((i - 1) // 2) * 34 * mm, 78 * mm, GREEN if i in (3, 6) else PURPLE)
    footer(c, 5)


def page_checklist(c):
    header(c, "5. Clinician Test Checklist", "Record what passed, what failed, and what needs workflow clarification.")
    items = [
        ("Login", "Clinician can sign in using old credentials."),
        ("Patient search", "Existing patient can be found by name, phone, patient ID, or national/passport ID."),
        ("Check-in", "Check-in/queue creates one active patient flow for the day."),
        ("Consent gating", "Clinical buttons stay blocked until consent is complete."),
        ("New visit", "New visit opens from the patient workspace and saves successfully."),
        ("Symptoms/problems", "Multiple symptoms can be added and individually resolved later."),
        ("Follow-up", "Follow-up shows prior complaint context and accepts new evaluation notes."),
        ("Vitals", "Vitals can be captured after consent and linked to a visit/time."),
        ("Patient record tabs", "Overview, diagnosis, remedies, vitals, follow-ups, documents, and notes display related records."),
        ("Errors", "Errors appear as clear user-facing messages, not technical traces."),
    ]
    x1 = MARGIN
    x2 = PAGE_W - MARGIN
    y = PAGE_H - 55 * mm
    row_h = 12 * mm
    c.setFillColor(PURPLE)
    c.rect(x1, y - row_h, x2 - x1, row_h, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x1 + 4 * mm, y - 8 * mm, "Area")
    c.drawString(x1 + 45 * mm, y - 8 * mm, "What to verify")
    c.drawString(x2 - 32 * mm, y - 8 * mm, "Pass / Fail")
    y -= row_h
    for idx, (area, verify) in enumerate(items):
        fill = colors.white if idx % 2 == 0 else BG
        c.setFillColor(fill)
        c.setStrokeColor(BORDER)
        c.rect(x1, y - row_h, x2 - x1, row_h, fill=1, stroke=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(x1 + 4 * mm, y - 8 * mm, area)
        draw_wrapped(c, verify, x1 + 45 * mm, y - 6 * mm, 92 * mm, size=7.4, leading=8.2, color=INK)
        c.setStrokeColor(MUTED)
        c.rect(x2 - 27 * mm, y - 9 * mm, 5 * mm, 5 * mm, fill=0, stroke=1)
        c.rect(x2 - 15 * mm, y - 9 * mm, 5 * mm, 5 * mm, fill=0, stroke=1)
        y -= row_h
    rounded_card(c, MARGIN, 42 * mm, PAGE_W - 2 * MARGIN, 22 * mm, "How to report feedback", "Send the patient code, action attempted, expected result, actual result, screenshot if possible, and whether the issue blocks real clinical work.", fill=colors.HexColor("#fff7ed"), stroke=colors.HexColor("#fed7aa"), title_color=colors.HexColor("#9a3412"))
    footer(c, 6)


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4)
    for page in (page_cover, page_login, page_checkin, page_new_visit, page_followup, page_checklist):
        page(c)
        c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
