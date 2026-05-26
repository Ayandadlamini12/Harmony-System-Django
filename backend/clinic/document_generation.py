from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils import timezone

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

    from weasyprint import HTML

    pdf_bytes = HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf()
    document.file.save(f"{reference}.pdf", ContentFile(pdf_bytes), save=False)
    document.save(update_fields=["file", "verification_payload", "updated_at"])

    if patient.consent_status == Patient.ConsentStatus.PENDING:
        patient.consent_status = Patient.ConsentStatus.GENERATED
        patient.save(update_fields=["consent_status", "updated_at"])

    return document
