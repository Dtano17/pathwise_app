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

// Welcome email template - Mobile Responsive
export function getWelcomeEmailHTML(firstName: string = 'there') {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to JournalMate!</title>
  <style type="text/css">
    /* Mobile-first responsive styles */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        border-radius: 0 !important;
      }
      .header-padding {
        padding: 35px 20px !important;
      }
      .content-padding {
        padding: 30px 20px !important;
      }
      .section-padding {
        padding: 25px 20px !important;
      }
      .cta-padding {
        padding: 15px 20px 35px !important;
      }
      .support-padding {
        padding: 0 20px 35px !important;
      }
      h1 {
        font-size: 28px !important;
      }
      h2 {
        font-size: 22px !important;
      }
      h3 {
        font-size: 20px !important;
      }
      h4 {
        font-size: 16px !important;
      }
      .feature-item {
        margin-bottom: 20px !important;
      }
      .cta-box {
        padding: 25px 20px !important;
      }
      .support-box {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 10px;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08); overflow: hidden; max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td class="header-padding" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #7c3aed 100%); padding: 50px 40px; text-align: center;">
              <h1 style="margin: 0 0 12px; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">Welcome to JournalMate</h1>
              <p style="margin: 0; color: #e9d5ff; font-size: 18px; font-weight: 500; line-height: 1.4;">your social planning &amp; adaptive journal</p>
            </td>
          </tr>

          <!-- Personal Message -->
          <tr>
            <td class="content-padding" style="padding: 45px 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 26px; font-weight: 600; line-height: 1.3;">Hey ${firstName}! 👋</h2>
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.7;">
                We're thrilled to welcome you into <strong>JournalMate</strong>—where planning becomes personal, journaling becomes adaptive, and your rhythm becomes the blueprint.
              </p>
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.7;">
                This isn't just another AI app.
              </p>
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.7; font-weight: 500;">
                It's your <strong>mate in motion</strong>—designed to help you reflect, plan, and grow with every swipe, snapshot, and shared moment.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 2px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent);"></div>
            </td>
          </tr>

          <!-- Features Section -->
          <tr>
            <td class="section-padding" style="padding: 35px 40px 20px;">
              <h3 style="margin: 0 0 28px; color: #8b5cf6; font-size: 22px; font-weight: 700; text-align: center; line-height: 1.3;">✨ What Makes JournalMate Different</h3>
              
              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">🔗 Shared Activities &amp; Group Sync</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Craft beautiful plans and routines, then share them with friends, teams, or accountability partners. Everyone can copy, remix, and track their own rhythm.
                </p>
              </div>

              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">🎯 Customizable &amp; Adaptive Planning</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Choose Quick Plan for freestyle structure or Smart Plan for deeply personalized routines. JournalMate adapts to your energy, context, and cadence.
                </p>
              </div>

              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">📸 Auto-Journaling with Feedback Loops</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Snap a photo, tag a moment, give a thumbs up/down. JournalMate curates your likes, dislikes, and reflections into a living journal—no writing required.
                </p>
              </div>

              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">🧠 Behavioral Intelligence Engine</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Track your rhythm, detect blockers, and pivot with fallback routines. JournalMate doesn't just log your journey—it helps you evolve.
                </p>
              </div>

              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">🎨 Visual Previews &amp; Emotional Tagging</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Share your plans with custom visuals, NYC backdrops, or your own media. Tag entries with emotion, context, and reactions to build your behavioral fingerprint.
                </p>
              </div>
            </td>
          </tr>

          <!-- Getting Started CTA -->
          <tr>
            <td class="cta-padding" style="padding: 20px 40px 45px;">
              <div class="cta-box" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 35px 30px; border-radius: 16px; text-align: center; box-shadow: 0 6px 20px rgba(139, 92, 246, 0.25);">
                <h3 style="margin: 0 0 18px; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">🚀 Getting Started Is Easy</h3>
                <div style="text-align: left; margin: 0 auto; max-width: 450px;">
                  <p style="margin: 0 0 14px; color: #ffffff; font-size: 15px; line-height: 1.6;"><strong style="color: #fde047;">1️⃣</strong> Tap <strong>New Plan</strong> → Try Quick or Smart</p>
                  <p style="margin: 0 0 14px; color: #ffffff; font-size: 15px; line-height: 1.6;"><strong style="color: #fde047;">2️⃣</strong> Journal with <strong>@keywords</strong>, photos, or voice</p>
                  <p style="margin: 0 0 14px; color: #ffffff; font-size: 15px; line-height: 1.6;"><strong style="color: #fde047;">3️⃣</strong> Swipe to complete, skip, or reflect</p>
                  <p style="margin: 0; color: #ffffff; font-size: 15px; line-height: 1.6;"><strong style="color: #fde047;">4️⃣</strong> Share your rhythm with friends or groups</p>
                </div>
              </div>
            </td>
          </tr>

          <!-- Support Section -->
          <tr>
            <td class="support-padding" style="padding: 0 40px 45px;">
              <div class="support-box" style="background-color: #f9fafb; padding: 28px; border-radius: 12px; border: 2px solid #e5e7eb; text-align: center;">
                <p style="margin: 0 0 10px; color: #374151; font-size: 16px; font-weight: 600; line-height: 1.4;">
                  Need help or want to share feedback?
                </p>
                <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.5;">
                  We're here for you: <a href="mailto:journamate@gmail.com" style="color: #8b5cf6; text-decoration: none; font-weight: 600;">journamate@gmail.com</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 35px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #111827; font-size: 18px; font-weight: 600; letter-spacing: 0.5px; line-height: 1.4;">
                Welcome to the rhythm. 💫
              </p>
              <p style="margin: 0 0 16px; color: #6b7280; font-size: 15px; line-height: 1.5;">
                Welcome to <strong>JournalMate</strong>.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
                © 2025 JournalMate. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
