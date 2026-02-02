import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

// Initialize Twilio client (if credentials are provided)
let twilioClient: twilio.Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Initialize SendGrid (if API key is provided)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface SendSMSParams {
  to: string;
  message: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class InviteService {
  /**
   * Send SMS invite via Twilio
   */
  static async sendSMS(params: SendSMSParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!twilioClient) {
      console.warn('Twilio not configured - skipping SMS send');
      return {
        success: false,
        error: 'SMS service not configured. Please add Twilio credentials to environment variables.'
      };
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      return {
        success: false,
        error: 'Twilio phone number not configured'
      };
    }

    try {
      const message = await twilioClient.messages.create({
        body: params.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: params.to
      });

      return {
        success: true,
        messageId: message.sid
      };
    } catch (error: any) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  /**
   * Send email invite via SendGrid
   */
  static async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid not configured - skipping email send');
      return {
        success: false,
        error: 'Email service not configured. Please add SendGrid API key to environment variables.'
      };
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      return {
        success: false,
        error: 'SendGrid from email not configured'
      };
    }

    try {
      const msg = {
        to: params.to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: params.subject,
        text: params.text,
        html: params.html,
      };

      const response = await sgMail.send(msg);

      return {
        success: true,
        messageId: response[0].headers['x-message-id']
      };
    } catch (error: any) {
      console.error('SendGrid email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Format phone number to E.164 format (+1234567890)
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If it's a US number without country code, add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If it already has country code but no +, add it
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    // If it has + already, return as is
    if (phone.startsWith('+')) {
      return phone;
    }

    // Otherwise, assume it has country code
    return `+${digits}`;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate SMS invite message
   */
  static generateSMSMessage(inviterName: string, groupName: string, inviteCode: string): string {
    return `${inviterName} invited you to join "${groupName}" on JournalMate! Download the app and use code: ${inviteCode} to join. https://journalmate.app/join?code=${inviteCode}`;
  }

  /**
   * Generate email invite HTML
   */
  static generateEmailHTML(inviterName: string, groupName: string, inviteCode: string, customMessage?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're invited to ${groupName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">You're Invited!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                <strong>${inviterName}</strong> has invited you to join <strong>"${groupName}"</strong> on JournalMate.
              </p>
              ${customMessage ? `
                <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px;">
                  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555; font-style: italic;">
                    "${customMessage}"
                  </p>
                </div>
              ` : ''}
              <div style="margin: 30px 0; padding: 30px; background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #666; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your Invite Code</p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                  ${inviteCode}
                </p>
              </div>
              <p style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                <strong>How to join:</strong>
              </p>
              <ol style="margin: 0 0 30px; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #555;">
                <li>Download JournalMate or visit the web app</li>
                <li>Go to the Groups tab</li>
                <li>Click "Join Group"</li>
                <li>Enter the invite code above</li>
              </ol>
              <div style="text-align: center;">
                <a href="https://journalmate.app/join?code=${inviteCode}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Join Group
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
                JournalMate - Plan Together, Achieve Together
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                This invitation was sent by ${inviterName}. If you didn't expect this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Generate email invite plain text version
   */
  static generateEmailText(inviterName: string, groupName: string, inviteCode: string, customMessage?: string): string {
    let text = `${inviterName} has invited you to join "${groupName}" on JournalMate.\n\n`;

    if (customMessage) {
      text += `Message from ${inviterName}:\n"${customMessage}"\n\n`;
    }

    text += `YOUR INVITE CODE: ${inviteCode}\n\n`;
    text += `How to join:\n`;
    text += `1. Download JournalMate or visit the web app\n`;
    text += `2. Go to the Groups tab\n`;
    text += `3. Click "Join Group"\n`;
    text += `4. Enter the invite code: ${inviteCode}\n\n`;
    text += `Or use this link: https://journalmate.app/join?code=${inviteCode}\n\n`;
    text += `---\n`;
    text += `JournalMate - Plan Together, Achieve Together\n`;
    text += `This invitation was sent by ${inviterName}.`;

    return text;
  }
}
