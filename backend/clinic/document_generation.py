from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils import timezone
import base64
from io import BytesIO
from mimetypes import guess_type
from pathlib import Path

from .document_branding import draw_reportlab_stamp, stamp_context
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


def signature_image_buffer(signature_data) -> BytesIO | None:
    if not signature_data:
        return None
    image_data = signature_data.get("signature_image", "")
    prefix = "data:image/png;base64,"
    if not image_data.startswith(prefix):
        return None
    try:
        decoded = base64.b64decode(image_data[len(prefix):], validate=True)
    except Exception:
        return None
    return BytesIO(decoded)


def logo_path() -> Path:
    return settings.BASE_DIR / "clinic" / "static" / "clinic" / "brand" / "harmony-letterhead.webp"


def file_data_url(path: Path) -> str:
    if not path.exists():
        return ""
    content_type = guess_type(path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def consent_context(patient: Patient, document: PatientDocument) -> dict:
    public_base_url = getattr(settings, "HARMONY_PUBLIC_URL", "").rstrip("/")
    verification_url = f"{public_base_url}/documents/verify/{document.document_id}" if public_base_url else str(document.document_id)
    reference = consent_document_reference(patient, document)
    signature_data = document.verification_payload.get("digital_signature") if document.verification_payload else None
    document.verification_payload = {
        **document.verification_payload,
        "reference": reference,
        "document_id": str(document.document_id),
        "patient_code": patient.patient_code,
        "patient_name": patient.full_name_display,
        "document_type": document.document_type,
        "status": document.status,
        "issued_at": timezone.now().isoformat(),
        "verification_url": verification_url,
    }
    return {
        "document": document,
        "patient": patient,
        "reference": reference,
        "issued_at": timezone.localtime(),
        "verification_url": verification_url,
        "qr_svg": make_qr_svg(verification_url),
        "logo_url": file_data_url(logo_path()),
        "signature_data": signature_data,
        "stamp": stamp_context(),
        "organization_name": "Harmony Health",
        "tagline": "Healthy Choices Today",
    }


def build_reportlab_consent_pdf(patient: Patient, document: PatientDocument, reference: str, verification_url: str, signature_data=None) -> bytes:
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
    header_cells = []
    if logo_path().exists():
        header_cells.append(Image(str(logo_path()), width=42 * mm, height=32 * mm))
    else:
        header_cells.append(Paragraph("<b>Harmony Health</b><br/>Healthy Choices Today", styles["Small"]))
    header_cells.append(
        Paragraph(
            "<b>Consent to Homeopathic Care and Wellness Support</b><br/>"
            f"<font size='8'>Document reference: {reference}</font><br/>"
            "<font size='8'>Private patient record - consent required before clinical care</font>",
            styles["HarmonyTitle"],
        )
    )
    header = Table([header_cells], colWidths=[48 * mm, 132 * mm])
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 2, colors.HexColor("#69be28")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story = [header, Spacer(1, 8)]
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
    signature_image = signature_image_buffer(signature_data)
    patient_signature_content = [Paragraph("\n\n_______________________________\nName: %s\nDate: ______________________" % patient.full_name_display, styles["Small"])]
    signature_audit = [Paragraph("Awaiting in-system handwritten signature", styles["Small"])]
    if signature_data:
        patient_signature_content = [
            Image(signature_image, width=70 * mm, height=24 * mm) if signature_image else Paragraph("Signature captured in Harmony Health MIS", styles["Small"]),
            Paragraph(f"Name: {signature_data.get('signer_name')}<br/>Date: {signature_data.get('signed_at')}", styles["Small"]),
        ]
        signature_audit = [
            Paragraph(
                f"<b>Signature audit:</b> Signed in Harmony Health MIS by {signature_data.get('signer_name')} "
                f"as {signature_data.get('signer_capacity')} using {signature_data.get('method')} at {signature_data.get('signed_at')}",
                styles["Small"],
            )
        ]
    signature_table = Table(
        [
            ["Patient / guardian signature", "Reception / witness confirmation"],
            [
                patient_signature_content,
                "\n\n_______________________________\nName: ______________________\nDate: ______________________",
            ],
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
    verification = Table([[qr, Paragraph(f"<b>Verification and barcode-ready reference</b><br/>Reference: {reference}<br/>Document ID: {document.document_id}<br/>Verification target: {verification_url}<br/>Status: {document.get_status_display()}", styles["Small"])]], colWidths=[34 * mm, 140 * mm])
    verification.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#b7c8bf")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story += [Spacer(1, 8), signature_table, Spacer(1, 8)]
    if signature_data:
        audit_table = Table([signature_audit], colWidths=[180 * mm])
        audit_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#69be28")),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#edf9ef")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story += [audit_table, Spacer(1, 10)]
    else:
        story += [Spacer(1, 10)]
    story += [verification]

    def footer(canvas, _doc):
        draw_reportlab_stamp(
            canvas,
            x=A4[0] * 0.73,
            y=A4[1] * 0.34,
            width=62 * mm,
            height=36 * mm,
            rotation=8,
        )
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#53605a"))
        canvas.drawCentredString(A4[0] / 2, 10 * mm, f"Harmony Health consent document - {reference} - Page {_doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()


def render_consent_html(document: PatientDocument) -> str:
    return render_to_string("clinic/documents/consent_form.html", consent_context(document.patient, document))


def render_consent_pdf(patient: Patient, document: PatientDocument) -> bytes:
    context = consent_context(patient, document)
    html = render_to_string("clinic/documents/consent_form.html", context)

    try:
        from weasyprint import HTML

        pdf_bytes = HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf()
    except Exception:
        pdf_bytes = build_reportlab_consent_pdf(
            patient,
            document,
            context["reference"],
            context["verification_url"],
            context["signature_data"],
        )
    return pdf_bytes


def save_consent_pdf(document: PatientDocument) -> PatientDocument:
    pdf_bytes = render_consent_pdf(document.patient, document)
    reference = consent_document_reference(document.patient, document)
    previous_file_name = document.file.name if document.file else ""
    if previous_file_name and document.file.storage.exists(previous_file_name):
        document.file.storage.delete(previous_file_name)
    document.file.save("consent.pdf", ContentFile(pdf_bytes), save=False)
    document.save(update_fields=["file", "status", "verification_payload", "signed_at", "verified_by", "updated_at"])
    return document


def generate_consent_pdf(patient: Patient, request=None) -> PatientDocument:
    user = request.user if request and request.user.is_authenticated else None
    document = PatientDocument.objects.create(
        patient=patient,
        document_type=PatientDocument.DocumentType.CONSENT_FORM,
        title="Harmony Health Consent to Homeopathic Care",
        status=PatientDocument.Status.PENDING_SIGNATURE,
        generated_by=user,
    )
    save_consent_pdf(document)

    if patient.consent_status == Patient.ConsentStatus.PENDING:
        patient.consent_status = Patient.ConsentStatus.GENERATED
        patient.save(update_fields=["consent_status", "updated_at"])

    return document


def sign_consent_document(document: PatientDocument, *, signer_name: str, signer_capacity: str, signature_image: str, request=None) -> PatientDocument:
    user = request.user if request and request.user.is_authenticated else None
    signed_at = timezone.now()
    document.status = PatientDocument.Status.SIGNED
    document.signed_at = signed_at
    document.verified_by = user
    document.verification_payload = {
        **document.verification_payload,
        "digital_signature": {
            "signer_name": signer_name,
            "signer_capacity": signer_capacity,
            "signature_image": signature_image,
            "method": "In-system handwritten signature",
            "signed_at": signed_at.isoformat(),
            "signed_by_user_id": user.id if user else None,
            "signed_by_username": user.get_username() if user else "",
        },
    }
    save_consent_pdf(document)
    patient = document.patient
    patient.consent_status = Patient.ConsentStatus.SIGNED
    patient.save(update_fields=["consent_status", "updated_at"])
    return document

