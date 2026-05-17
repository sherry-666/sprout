from app.core.config import settings
from app.core.email._base import _send_email


def send_parent_invite(
    to_email: str,
    token: str,
    institution_name: str,
    first_name: str,
    kid_name: str,
) -> bool:
    activation_url = f"{settings.FRONTEND_URL}/activate?token={token}"
    subject = f"Stay connected with {kid_name}'s day at {institution_name}"
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 40px;">🌱</span>
            <h1 style="margin: 8px 0 0; font-size: 28px; color: #1a1a2e;">Sprout</h1>
            <p style="color: #64748b; margin: 8px 0 0; font-size: 15px;">Daily updates for the parents who care</p>
        </div>

        <div style="background: linear-gradient(135deg, #fff7ed, #fef3c7); border-radius: 16px; padding: 36px; margin-bottom: 24px; border: 1px solid #fde68a;">
            <h2 style="margin: 0 0 12px; color: #1a1a2e; font-size: 22px;">Hi {first_name}! 🎉</h2>
            <p style="color: #555; line-height: 1.7; margin: 0 0 16px; font-size: 16px;">
                <strong>{institution_name}</strong> has registered <strong>{kid_name}</strong> on Sprout
                and added you as a parent.
            </p>
            <p style="color: #555; line-height: 1.7; margin: 0 0 24px;">
                Sprout keeps you connected to your child's day — real-time activity updates,
                photos from the classroom, and an AI-generated summary of their day, delivered right to you.
            </p>

            <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 28px;">
                <p style="margin: 0 0 12px; font-weight: 600; color: #1a1a2e; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">What you'll get on Sprout</p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="color: #555; font-size: 14px; line-height: 1.5;">📸 &nbsp;Photos and activity updates throughout the day</div>
                    <div style="color: #555; font-size: 14px; line-height: 1.5;">🍽️ &nbsp;Meal, nap, and learning logs in real time</div>
                    <div style="color: #555; font-size: 14px; line-height: 1.5;">📝 &nbsp;AI-written daily summary when the day wraps up</div>
                    <div style="color: #555; font-size: 14px; line-height: 1.5;">💬 &nbsp;Direct messaging with educators</div>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="{activation_url}"
                   style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706);
                          color: white; text-decoration: none; padding: 16px 40px;
                          border-radius: 10px; font-weight: 700; font-size: 17px;
                          box-shadow: 0 4px 14px rgba(245,158,11,0.35);">
                    Set Up My Account →
                </a>
            </div>
        </div>

        <p style="color: #999; font-size: 13px; text-align: center; line-height: 1.6;">
            This link expires in 72 hours. If you weren't expecting this, you can safely ignore it.
        </p>
    </div>
    """
    return _send_email(to_email, subject, html_content, activation_url)
