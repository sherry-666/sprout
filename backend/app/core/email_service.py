"""
Email service for sending transactional emails via SendGrid.

In dev mode, emails are only sent to whitelisted addresses.
Gmail addresses are normalized (dots stripped, +suffix removed) for whitelist comparison.
"""

import logging
import re
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def normalize_gmail(email: str) -> str:
    """Normalize a Gmail address for whitelist comparison.

    - Strips dots from the local part (Gmail ignores them).
    - Strips +suffix (Gmail alias feature).
    - Lowercases the whole address.

    For non-Gmail addresses, just lowercases.
    """
    email = email.strip().lower()
    local, domain = email.rsplit("@", 1)

    if domain in ("gmail.com", "googlemail.com"):
        # Strip +suffix
        local = re.sub(r"\+.*$", "", local)
        # Strip dots
        local = local.replace(".", "")

    return f"{local}@{domain}"


def is_whitelisted(email: str) -> bool:
    """Check if an email passes the dev whitelist.

    Always returns True if EMAIL_WHITELIST_ENABLED is False (e.g. in production).
    """
    if not settings.EMAIL_WHITELIST_ENABLED:
        return True

    normalized = normalize_gmail(email)
    whitelist = [
        normalize_gmail(e.strip())
        for e in settings.EMAIL_WHITELIST.split(",")
        if e.strip()
    ]

    return normalized in whitelist


def send_activation_email(
    to_email: str,
    token: str,
    institution_name: str,
    first_name: str,
    role: str = "admin",
) -> bool:
    """Send an account activation email.

    Returns True if the email was sent (or logged in dev).
    Raises ValueError if the email is not whitelisted in dev mode.
    """
    if not is_whitelisted(to_email):
        raise ValueError(
            f"Email {to_email} is not in the dev whitelist. "
            f"Only emails to {settings.EMAIL_WHITELIST} (and aliases) are allowed."
        )

    activation_url = f"{settings.FRONTEND_URL}/activate?token={token}"

    subject = f"You've been invited to manage {institution_name} on Sprout"
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 32px;">🌱</span>
            <h1 style="margin: 8px 0 0; font-size: 24px; color: #1a1a2e;">Sprout</h1>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px; color: #1a1a2e;">Welcome, {first_name}!</h2>
            <p style="color: #555; line-height: 1.6; margin: 0 0 16px;">
                You've been invited as the <strong>administrator</strong> of
                <strong>{institution_name}</strong> on the Sprout platform.
            </p>
            <p style="color: #555; line-height: 1.6; margin: 0 0 24px;">
                Click the button below to set your password and activate your account.
            </p>
            <div style="text-align: center;">
                <a href="{activation_url}"
                   style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED);
                          color: white; text-decoration: none; padding: 14px 32px;
                          border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Activate Your Account
                </a>
            </div>
        </div>

        <p style="color: #999; font-size: 13px; text-align: center;">
            This link will expire in 72 hours. If you didn't expect this invitation, you can safely ignore this email.
        </p>
    </div>
    """

    # If no SendGrid API key is configured, log the email instead of sending
    if not settings.SENDGRID_API_KEY:
        logger.warning(
            "SENDGRID_API_KEY not set — email NOT sent. "
            "Activation URL: %s", activation_url
        )
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
