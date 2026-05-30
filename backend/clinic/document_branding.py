from dataclasses import dataclass

from django.utils import timezone


@dataclass(frozen=True)
class OrganizationStamp:
    name_line_1: str = "HARMONY HEALTH AND"
    name_line_2: str = "WELLNESS (PTY) LTD"
    address: str = "P.O. Box 3516, Manzini"
    phone: str = "Tel: +268 3460 1079"
    email: str = "Email: harmonyhealth@webmail.co.za"

    def html_context(self) -> dict:
        return {
            "name_line_1": self.name_line_1,
            "name_line_2": self.name_line_2,
            "address": self.address,
            "phone": self.phone,
            "email": self.email,
        }


DEFAULT_STAMP = OrganizationStamp()


def stamp_context() -> dict:
    return DEFAULT_STAMP.html_context()


def draw_reportlab_stamp(
    canvas,
    *,
    x,
    y,
    width,
    height,
    rotation=0,
    color=None,
    alpha=0.58,
    include_date=True,
):
    from reportlab.lib import colors
    from reportlab.lib.units import mm

    stamp_color = color or colors.HexColor("#1a4d7a")
    stamp = DEFAULT_STAMP

    canvas.saveState()
    canvas.translate(x, y)
    if rotation:
        canvas.rotate(rotation)

    canvas.setStrokeColor(stamp_color)
    canvas.setFillColor(stamp_color)
    canvas.setLineWidth(1.2)
    canvas.setFillAlpha(alpha)
    canvas.setStrokeAlpha(alpha)

    canvas.rect(-width / 2, -height / 2, width, height)
    canvas.setLineWidth(0.6)
    canvas.rect((-width / 2) + 1.5 * mm, (-height / 2) + 1.5 * mm, width - 3 * mm, height - 3 * mm)

    text_y = (height / 2) - 7 * mm
    line_gap = 5.3 * mm
    canvas.setFont("Courier-Bold", 8)
    canvas.drawCentredString(0, text_y, stamp.name_line_1)
    canvas.drawCentredString(0, text_y - line_gap, stamp.name_line_2)

    canvas.setFont("Courier", 6.2)
    canvas.drawCentredString(0, text_y - (line_gap * 2.1), stamp.address)
    canvas.drawCentredString(0, text_y - (line_gap * 3.05), stamp.phone)
    canvas.drawCentredString(0, text_y - (line_gap * 4.0), stamp.email)
    if include_date:
        canvas.drawCentredString(0, text_y - (line_gap * 5.0), timezone.localtime().strftime("%d %b %Y"))

    canvas.restoreState()
