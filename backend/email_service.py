# Email Service using Resend
import os
import base64
import asyncio
import logging
import resend
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
APP_NAME = "MzansiBuilds"


def _app_public_url() -> str:
    raw = os.environ.get("APP_PUBLIC_URL", "").strip()
    if raw:
        return raw.rstrip("/")
    return base64.b64decode(
        "aHR0cHM6Ly9temFuc2ktYnVpbGRzLnByZXZpZXcuZW1lcmdlbnRhZ2VudC5jb20="
    ).decode("ascii").rstrip("/")


APP_PUBLIC_URL = _app_public_url()

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html_content: str) -> dict:
    """Send an email using Resend API (non-blocking)"""
    if not resend.api_key:
        logger.warning("Resend API key not configured, skipping email")
        return {"status": "skipped", "reason": "API key not configured"}
    
    params = {
        "from": f"{APP_NAME} <{SENDER_EMAIL}>",
        "to": [to],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {subject}")
        return {"status": "success", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return {"status": "error", "error": str(e)}


# ========== Email Templates ==========

async def send_welcome_email(to: str, name: str):
    """Send welcome email after signup"""
    subject = f"Welcome to {APP_NAME}! 🎉"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e4e4e7; background-color: #09090b; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 8px; padding: 40px; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .logo {{ font-size: 28px; font-weight: bold; color: #fff; }}
            .logo span {{ color: #f59e0b; }}
            h1 {{ color: #fff; font-size: 24px; margin-bottom: 10px; }}
            p {{ color: #a1a1aa; margin: 15px 0; }}
            .button {{ display: inline-block; background-color: #f59e0b; color: #09090b; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; margin-top: 20px; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a; text-align: center; color: #71717a; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Mzansi<span>Builds</span></div>
            </div>
            <h1>Welcome, {name}! 👋</h1>
            <p>Your account is ready. You're now part of a community of South African developers building in public.</p>
            <p>Here's what you can do:</p>
            <ul style="color: #a1a1aa;">
                <li>🚀 Create your first project</li>
                <li>📢 Share updates as you build</li>
                <li>🤝 Collaborate with other developers</li>
                <li>🏆 Celebrate when you ship!</li>
            </ul>
            <p>Ready to start building?</p>
            <a href="{APP_PUBLIC_URL}/dashboard" class="button">Go to Dashboard</a>
            <div class="footer">
                <p>Built with pride in South Africa 🇿🇦</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(to, subject, html)


async def send_collaboration_request_email(
    to: str, 
    owner_name: str, 
    project_title: str, 
    requester_name: str,
    message: str = None
):
    """Send email when someone requests to collaborate"""
    subject = f"New collaboration request on {project_title}"
    message_section = f'<p style="color: #a1a1aa; background-color: #27272a; padding: 15px; border-radius: 4px; margin: 20px 0;"><em>"{message}"</em></p>' if message else ''
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e4e4e7; background-color: #09090b; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 8px; padding: 40px; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .logo {{ font-size: 28px; font-weight: bold; color: #fff; }}
            .logo span {{ color: #f59e0b; }}
            h1 {{ color: #fff; font-size: 24px; margin-bottom: 10px; }}
            p {{ color: #a1a1aa; margin: 15px 0; }}
            .highlight {{ color: #f59e0b; font-weight: 600; }}
            .button {{ display: inline-block; background-color: #f59e0b; color: #09090b; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; margin-top: 20px; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a; text-align: center; color: #71717a; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Mzansi<span>Builds</span></div>
            </div>
            <h1>🤝 New Collaboration Request</h1>
            <p>Hey {owner_name},</p>
            <p><span class="highlight">{requester_name}</span> wants to collaborate on your project <span class="highlight">{project_title}</span>.</p>
            {message_section}
            <p>Review the request and decide if you want to work together!</p>
            <a href="{APP_PUBLIC_URL}/dashboard" class="button">View Request</a>
            <div class="footer">
                <p>Built with pride in South Africa 🇿🇦</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(to, subject, html)


async def send_comment_notification_email(
    to: str,
    owner_name: str,
    project_title: str,
    commenter_name: str,
    comment_preview: str
):
    """Send email when someone comments on a project"""
    subject = f"New comment on {project_title}"
    # Truncate comment preview
    if len(comment_preview) > 150:
        comment_preview = comment_preview[:150] + "..."
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e4e4e7; background-color: #09090b; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 8px; padding: 40px; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .logo {{ font-size: 28px; font-weight: bold; color: #fff; }}
            .logo span {{ color: #f59e0b; }}
            h1 {{ color: #fff; font-size: 24px; margin-bottom: 10px; }}
            p {{ color: #a1a1aa; margin: 15px 0; }}
            .highlight {{ color: #f59e0b; font-weight: 600; }}
            .comment-box {{ background-color: #27272a; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 3px solid #f59e0b; }}
            .button {{ display: inline-block; background-color: #f59e0b; color: #09090b; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; margin-top: 20px; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a; text-align: center; color: #71717a; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Mzansi<span>Builds</span></div>
            </div>
            <h1>💬 New Comment</h1>
            <p>Hey {owner_name},</p>
            <p><span class="highlight">{commenter_name}</span> commented on your project <span class="highlight">{project_title}</span>:</p>
            <div class="comment-box">
                <p style="margin: 0; color: #e4e4e7;">"{comment_preview}"</p>
            </div>
            <a href="{APP_PUBLIC_URL}/dashboard" class="button">View Comment</a>
            <div class="footer">
                <p>Built with pride in South Africa 🇿🇦</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(to, subject, html)


async def send_project_completed_email(to: str, name: str, project_title: str):
    """Send congratulations email when a project is completed"""
    subject = f"🎉 Congratulations! {project_title} is complete!"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #e4e4e7; background-color: #09090b; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 8px; padding: 40px; }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .logo {{ font-size: 28px; font-weight: bold; color: #fff; }}
            .logo span {{ color: #f59e0b; }}
            .celebration {{ text-align: center; font-size: 48px; margin: 20px 0; }}
            h1 {{ color: #fff; font-size: 28px; margin-bottom: 10px; text-align: center; }}
            p {{ color: #a1a1aa; margin: 15px 0; text-align: center; }}
            .highlight {{ color: #22c55e; font-weight: 600; }}
            .button {{ display: inline-block; background-color: #f59e0b; color: #09090b; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; margin-top: 20px; }}
            .button-container {{ text-align: center; }}
            .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #27272a; text-align: center; color: #71717a; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Mzansi<span>Builds</span></div>
            </div>
            <div class="celebration">🏆</div>
            <h1>You Shipped It!</h1>
            <p>Congratulations, {name}!</p>
            <p>Your project <span class="highlight">{project_title}</span> is now on the <strong>Celebration Wall</strong>!</p>
            <p>You're part of an exclusive group of builders who finish what they start. That's something to be proud of.</p>
            <div class="button-container">
                <a href="{APP_PUBLIC_URL}/celebration" class="button">View Celebration Wall</a>
            </div>
            <div class="footer">
                <p>Built with pride in South Africa 🇿🇦</p>
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(to, subject, html)
