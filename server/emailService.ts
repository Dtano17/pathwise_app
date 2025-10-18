import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableResendClient() {
  const { apiKey } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: connectionSettings.settings.from_email
  };
}

// Welcome email template
export function getWelcomeEmailHTML(firstName: string = 'there') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to JournalMate!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 8px;">📖</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Welcome to JournalMate</h1>
              <p style="margin: 12px 0 0; color: #e9d5ff; font-size: 16px; font-weight: 500;">Your AI-Powered Life Planning Companion</p>
            </td>
          </tr>

          <!-- Personal Message -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 600;">Hey ${firstName}! 👋</h2>
              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                I'm <strong>Dennis Tanaruno</strong>, founder of JournalMate, and I'm thrilled to have you here! 
              </p>
              <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                JournalMate isn't just another planning app—it's your <strong>personal AI companion</strong> that transforms your intentions into achievable plans, helps you stay organized, and celebrates every win along the way. 🎉
              </p>
              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Whether you're planning your next adventure, organizing your week, or journaling your journey, we've built something special to make it effortless and enjoyable.
              </p>
            </td>
          </tr>

          <!-- Feature Showcase -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h3 style="margin: 0 0 24px; color: #8b5cf6; font-size: 20px; font-weight: 600;">✨ What Makes JournalMate Special</h3>
              
              <div style="margin-bottom: 20px; padding: 16px; background-color: #f9fafb; border-left: 4px solid: #8b5cf6; border-radius: 8px;">
                <strong style="color: #111827; font-size: 16px;">🤖 AI Smart & Quick Plans</strong>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Choose <em>Quick Plan</em> for instant task generation or <em>Smart Plan</em> for deeply personalized planning through conversational AI. Your intentions become actionable steps in seconds!
                </p>
              </div>

              <div style="margin-bottom: 20px; padding: 16px; background-color: #f9fafb; border-left: 4px solid #6366f1; border-radius: 8px;">
                <strong style="color: #111827; font-size: 16px;">📝 Personal Journal with @Keywords</strong>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Type naturally and let AI organize your thoughts! Use @keywords like @restaurants, @travel, or @music, upload photos and videos, and watch JournalMate automatically categorize everything beautifully.
                </p>
              </div>

              <div style="margin-bottom: 20px; padding: 16px; background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 8px;">
                <strong style="color: #111827; font-size: 16px;">🎨 Social Sharing with Beautiful Previews</strong>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Share your activities with stunning custom preview cards! Choose NYC-themed backdrops or upload your own images. Your friends can instantly copy and customize your plans for themselves!
                </p>
              </div>

              <div style="margin-bottom: 20px; padding: 16px; background-color: #f9fafb; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <strong style="color: #111827; font-size: 16px;">👥 Collaborative Group Planning</strong>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Create groups, share goals, and track progress together. Perfect for teams, families, or friend groups working toward common goals!
                </p>
              </div>

              <div style="margin-bottom: 20px; padding: 16px; background-color: #f9fafb; border-left: 4px solid #ec4899; border-radius: 8px;">
                <strong style="color: #111827; font-size: 16px;">💫 Swipeable Task Cards & Feedback</strong>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Swipe right to complete, left to skip! Give thumbs up/down feedback on tasks, and watch your progress dashboard light up with streaks and analytics.
                </p>
              </div>

              <div style="margin-bottom: 20px; padding: 16px; background-color: #f9fafb; border-left: 4px solid #14b8a6; border-radius: 8px;">
                <strong style="color: #111827; font-size: 16px;">🎙️ Voice Input & Hands-Free Planning</strong>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Too busy to type? Just speak your goals and let JournalMate handle the rest. Perfect for planning on the go!
                </p>
              </div>

              <div style="margin-bottom: 20px; padding: 16px; background-color: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 8px;">
                <strong style="color: #111827; font-size: 16px;">📊 Progress Dashboard & Streaks</strong>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  Visualize your journey with beautiful charts, track completion rates, build streaks, and celebrate every milestone!
                </p>
              </div>
            </td>
          </tr>

          <!-- Getting Started -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 32px; border-radius: 12px; text-align: center;">
                <h3 style="margin: 0 0 16px; color: #ffffff; font-size: 22px; font-weight: 600;">🚀 Ready to Get Started?</h3>
                <p style="margin: 0 0 24px; color: #e9d5ff; font-size: 15px; line-height: 1.5;">
                  Here's your quick guide to making the most of JournalMate:
                </p>
                <div style="text-align: left; margin: 0 auto; max-width: 400px;">
                  <p style="margin: 0 0 12px; color: #ffffff; font-size: 14px;"><strong>1.</strong> Click "New Plan" and try Quick Plan or Smart Plan</p>
                  <p style="margin: 0 0 12px; color: #ffffff; font-size: 14px;"><strong>2.</strong> Start journaling with @keywords and media</p>
                  <p style="margin: 0 0 12px; color: #ffffff; font-size: 14px;"><strong>3.</strong> Complete tasks by swiping right and build your streak</p>
                  <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>4.</strong> Share your favorite activities with friends!</p>
                </div>
              </div>
            </td>
          </tr>

          <!-- Support Section -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 12px; color: #4b5563; font-size: 15px;">
                  <strong>Need help or have questions?</strong>
                </p>
                <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">
                  We're here for you! Reach out anytime:
                </p>
                <p style="margin: 0; color: #8b5cf6; font-size: 15px; font-weight: 600;">
                  <a href="mailto:journamate@gmail.com" style="color: #8b5cf6; text-decoration: none;">journamate@gmail.com</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px 40px; text-align: center;">
              <p style="margin: 0 0 8px; color: #9ca3af; font-size: 13px;">
                Can't wait to see what you'll achieve with JournalMate! 🌟
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                <strong>With gratitude,</strong><br>
                Dennis Tanaruno<br>
                <em>Founder, JournalMate</em>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendWelcomeEmail(email: string, firstName: string = 'there') {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Welcome to JournalMate, ${firstName}! 🎉 Your AI Planning Journey Starts Now`,
      html: getWelcomeEmailHTML(firstName),
    });

    if (error) {
      console.error('[EMAIL] Failed to send welcome email:', error);
      return { success: false, error };
    }

    console.log('[EMAIL] Welcome email sent successfully:', { email, emailId: data?.id });
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('[EMAIL] Error sending welcome email:', error);
    return { success: false, error };
  }
}
