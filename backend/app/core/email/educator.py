from app.core.config import settings
from app.core.email._base import _send_email


def send_educator_invite(
    to_email: str,
    token: str,
    institution_name: str,
    first_name: str,
    invited_by: str,
) -> bool:
    activation_url = f"{settings.FRONTEND_URL}/activate?token={token}"
    subject = f"{invited_by} invited you to join {institution_name} on Sprout"
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 40px;">🌱</span>
            <h1 style="margin: 8px 0 0; font-size: 28px; color: #1a1a2e;">Sprout</h1>
            <p style="color: #64748b; margin: 8px 0 0; font-size: 15px;">The smart home for your day care</p>
        </div>
        <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border-radius: 16px; padding: 36px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
            <h2 style="margin: 0 0 12px; color: #1a1a2e; font-size: 22px;">Hi {first_name}! 👋</h2>
            <p style="color: #555; line-height: 1.7; margin: 0 0 20px; font-size: 16px;">
                <strong>{invited_by}</strong> has invited you to join
                <strong>{institution_name}</strong> on the Sprout platform as an educator.
            </p>
            <p style="color: #555; line-height: 1.7; margin: 0 0 28px;">
                With Sprout you can log daily activities, share photos with parents,
                and use AI to draft warm, personalised updates — all from one place.
            </p>
            <div style="text-align: center;">
                <a href="{activation_url}"
                   style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669);
                          color: white; text-decoration: none; padding: 16px 40px;
                          border-radius: 10px; font-weight: 700; font-size: 17px;
                          box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                    Accept Invitation →
                </a>
            </div>
        </div>
        <p style="color: #999; font-size: 13px; text-align: center; line-height: 1.6;">
            This link expires in 72 hours. If you weren't expecting this, you can safely ignore it.
        </p>
    </div>
    """
    return _send_email(to_email, subject, html_content, activation_url)
