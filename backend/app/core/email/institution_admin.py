from app.core.config import settings
from app.core.email._base import _send_email


def send_institution_admin_invite(
    to_email: str,
    token: str,
    institution_name: str,
    first_name: str,
) -> bool:
    activation_url = f"{settings.FRONTEND_URL}/activate?token={token}"
    subject = f"Welcome to Sprout — {institution_name} is ready for you"
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 40px;">🌱</span>
            <h1 style="margin: 8px 0 0; font-size: 28px; color: #1a1a2e;">Welcome to Sprout</h1>
            <p style="color: #64748b; margin: 8px 0 0; font-size: 15px;">The smart home for your day care</p>
        </div>

        <div style="background: linear-gradient(135deg, #eef2ff, #f5f3ff); border-radius: 16px; padding: 36px; margin-bottom: 24px; border: 1px solid #e0e7ff;">
            <h2 style="margin: 0 0 12px; color: #1a1a2e; font-size: 22px;">Hi {first_name}, your institution is live! 🎉</h2>
            <p style="color: #555; line-height: 1.7; margin: 0 0 16px;">
                <strong>{institution_name}</strong> has been set up on the Sprout platform and you've been
                appointed as its administrator.
            </p>
            <p style="color: #555; line-height: 1.7; margin: 0 0 24px;">
                Sprout gives you everything you need to run a modern day care — manage classes and educators,
                keep parents in the loop with real-time updates, and let AI handle the heavy lifting on
                daily reports and photo tagging.
            </p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
                <p style="margin: 0 0 12px; font-weight: 600; color: #1a1a2e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">What you can do with Sprout</p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="color: #555; font-size: 14px; line-height: 1.5;">✅ &nbsp;Manage classes and assign educators</div>
                    <div style="color: #555; font-size: 14px; line-height: 1.5;">✅ &nbsp;Invite educators and track daily activity</div>
                    <div style="color: #555; font-size: 14px; line-height: 1.5;">✅ &nbsp;Register kids and link them to parents</div>
                    <div style="color: #555; font-size: 14px; line-height: 1.5;">✅ &nbsp;AI-generated parent updates and daily summaries</div>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="{activation_url}"
                   style="display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED);
                          color: white; text-decoration: none; padding: 16px 40px;
                          border-radius: 10px; font-weight: 700; font-size: 17px;
                          box-shadow: 0 4px 14px rgba(79,70,229,0.35);">
                    Set Up Your Institution →
                </a>
            </div>
        </div>

        <p style="color: #999; font-size: 13px; text-align: center; line-height: 1.6;">
            This link expires in 72 hours. If you weren't expecting this, you can safely ignore it.
        </p>
    </div>
    """
    return _send_email(to_email, subject, html_content, activation_url)
