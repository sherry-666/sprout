import logging
import re
from app.core.config import settings

logger = logging.getLogger(__name__)


def normalize_gmail(email: str) -> str:
    email = email.strip().lower()
    local, domain = email.rsplit("@", 1)
    if domain in ("gmail.com", "googlemail.com"):
        local = re.sub(r"\+.*$", "", local)
        local = local.replace(".", "")
    return f"{local}@{domain}"


def is_whitelisted(email: str) -> bool:
    if not settings.EMAIL_WHITELIST_ENABLED:
        return True
    normalized = normalize_gmail(email)
    whitelist = [
        normalize_gmail(e.strip())
        for e in settings.EMAIL_WHITELIST.split(",")
        if e.strip()
    ]
    return normalized in whitelist


def _send_email(to_email: str, subject: str, html_content: str, activation_url: str) -> bool:
    if not settings.SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not set — email NOT sent. Activation URL: %s", activation_url)
        print(f"\n{'='*60}")
        print(f"📧 DEV EMAIL (not actually sent)")
        print(f"   To: {to_email}")
        print(f"   Subject: {subject}")
        print(f"   Activation URL: {activation_url}")
        print(f"{'='*60}\n")
        return True

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info("Email sent to %s, status: %s", to_email, response.status_code)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, e)
        raise
