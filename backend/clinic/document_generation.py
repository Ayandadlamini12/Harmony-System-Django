from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils import timezone
from io import BytesIO

from .models import Patient, PatientDocument


def consent_document_reference(patient: Patient, document: PatientDocument) -> str:
    return f"HH-CONSENT-{patient.patient_code}-{str(document.document_id)[:8].upper()}"


def make_qr_svg(payload: str) -> str:
    import qrcode
    import qrcode.image.svg

    qr = qrcode.QRCode(image_factory=qrcode.image.svg.SvgPathImage, border=1)
    qr.add_data(payload)
    qr.make(fit=True)
    image = qr.make_image(attrib={"class": "verification-qr"})
    return image.to_string(encoding="unicode")


def make_qr_png(payload: str) -> BytesIO:
    import qrcode

    buffer = BytesIO()
    image = qrcode.make(payload)
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def build_reportlab_consent_pdf(patient: Patient, document: PatientDocument, reference: str, verification_url: str) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title=document.title,
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="HarmonyTitle", parent=styles["Title"], textColor=colors.HexColor("#5b2388"), fontSize=18, leading=22))
    styles.add(ParagraphStyle(name="HarmonyHeading", parent=styles["Heading2"], textColor=colors.HexColor("#5b2388"), fontSize=11, leading=14, spaceBefore=10, spaceAfter=4))
    styles.add(ParagraphStyle(name="HarmonyBody", parent=styles["BodyText"], fontSize=9.5, leading=14, spaceAfter=5))
    styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontSize=7.5, leading=10, textColor=colors.HexColor("#53605a")))
    story = [
        Paragraph("Harmony Health", styles["Small"]),
        Paragraph("Consent to Homeopathic Care and Wellness Support", styles["HarmonyTitle"]),
        Paragraph(f"Document reference: {reference}", styles["Small"]),
        Spacer(1, 8),
    ]
    meta = [
        ["Patient name", patient.full_name_display, "Patient code", patient.patient_code],
        ["National / Passport ID", patient.national_id or "Not provided", "Date of birth", patient.date_of_birth or "Not provided"],
        ["Primary phone", patient.primary_phone or "Not provided", "Generated date", timezone.localtime().strftime("%d %b %Y %H:%M")],
        ["Next of kin", patient.next_of_kin_full_name or "Not provided", "Next of kin phone", patient.next_of_kin_phone or "Not provided"],
    ]
    meta_table = Table(meta, colWidths=[35 * mm, 55 * mm, 35 * mm, 55 * mm])
    meta_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#b7c8bf")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7faf8")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("LEADING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [meta_table, Spacer(1, 8)]
    sections = [
        ("Important", "This document records informed consent for homeopathic and wellness support. It should be read and understood before clinical consultation, diagnosis discussion, remedy recommendation, or medical-history recording begins."),
        ("1. Nature of Services", "I understand that Harmony Health provides homeopathic and wellness-focused care. Consultations may include discussion of symptoms, lifestyle, diet, emotional wellbeing, personal history, family history, medication use, and other information relevant to holistic assessment. Homeopathic care is complementary and does not replace emergency medical treatment, hospital care, prescribed medication, surgery, or specialist medical advice where required."),
        ("2. Patient Responsibilities", "I agree to provide accurate and complete information, disclose medication and relevant history, and understand that I should not stop prescribed medication or delay urgent medical care unless advised by an appropriately qualified medical practitioner. I understand that treatment response can vary and no guaranteed outcome is promised."),
        ("3. Consent to Record and Store Information", "I consent to Harmony Health recording and storing my personal information, consultation notes, wellness assessments, remedy recommendations, follow-up records, documents, and communication history for care continuity, legal recordkeeping, quality control, and administrative purposes."),
        ("4. Privacy and Communication", "I consent to being contacted using the phone number, email address, or messaging channels I provide for appointments, follow-ups, administrative notices, and care-related communication. I understand that external channels such as WhatsApp, Telegram, or email may have their own privacy limitations."),
        ("5. Consent Decision", "By signing below, I confirm that I have had an opportunity to read this form, ask questions, and decide whether to proceed. I understand the scope and limits of homeopathic care and consent to the start of my Harmony Health care record."),
    ]
    for heading, body in sections:
        story.append(Paragraph(heading, styles["HarmonyHeading"]))
        story.append(Paragraph(body, styles["HarmonyBody"]))
    signature_table = Table(
        [
            ["Patient / guardian signature", "Reception / witness signature"],
            ["\n\n_______________________________\nName: %s\nDate: ______________________" % patient.full_name_display, "\n\n_______________________________\nName: ______________________\nDate: ______________________"],
        ],
        colWidths=[90 * mm, 90 * mm],
    )
    signature_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#9fb2aa")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f6f0fb")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
    ]))
    qr = Image(make_qr_png(verification_url), width=30 * mm, height=30 * mm)
    verification = Table([[qr, Paragraph(f"<b>Verification and barcode-ready reference</b><br/>Reference: {reference}<br/>Document ID: {document.document_id}<br/>Verification target: {verification_url}", styles["Small"])]], colWidths=[34 * mm, 140 * mm])
    verification.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#b7c8bf")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story += [Spacer(1, 8), signature_table, Spacer(1, 10), verification]

    def footer(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#53605a"))
        canvas.drawCentredString(A4[0] / 2, 10 * mm, f"Harmony Health consent document - {reference} - Page {_doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()


def generate_consent_pdf(patient: Patient, request=None) -> PatientDocument:
    user = request.user if request and request.user.is_authenticated else None
    document = PatientDocument.objects.create(
        patient=patient,
        document_type=PatientDocument.DocumentType.CONSENT_FORM,
        title="Harmony Health Consent to Homeopathic Care",
        status=PatientDocument.Status.PENDING_SIGNATURE,
        generated_by=user,
    )
    public_base_url = getattr(settings, "HARMONY_PUBLIC_URL", "").rstrip("/")
    verification_url = f"{public_base_url}/documents/verify/{document.document_id}" if public_base_url else str(document.document_id)
    reference = consent_document_reference(patient, document)
    document.verification_payload = {
        "reference": reference,
        "document_id": str(document.document_id),
        "patient_code": patient.patient_code,
        "patient_name": patient.full_name_display,
        "document_type": document.document_type,
        "issued_at": timezone.now().isoformat(),
        "verification_url": verification_url,
    }

    html = render_to_string(
        "clinic/documents/consent_form.html",
        {
            "document": document,
            "patient": patient,
            "reference": reference,
            "issued_at": timezone.localtime(),
            "verification_url": verification_url,
            "qr_svg": make_qr_svg(verification_url),
            "organization_name": "Harmony Health",
            "tagline": "Healthy Choices Today",
        },
    )

    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf()
    except Exception:
        pdf_bytes = build_reportlab_consent_pdf(patient, document, reference, verification_url)
    document.file.save(f"{reference}.pdf", ContentFile(pdf_bytes), save=False)
    document.save(update_fields=["file", "verification_payload", "updated_at"])

    if patient.consent_status == Patient.ConsentStatus.PENDING:
        patient.consent_status = Patient.ConsentStatus.GENERATED
        patient.save(update_fields=["consent_status", "updated_at"])

    return document
