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

// Get base URL for email assets
function getBaseURL(): string {
  if (process.env.REPLIT_DEPLOYMENT === '1') {
    const domains = process.env.REPLIT_DOMAINS?.split(',')[0];
    return domains ? `https://${domains}` : '';
  }
  return process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : '';
}

// Welcome email template - Mobile Responsive
export function getWelcomeEmailHTML(firstName: string = 'there') {
  const baseURL = getBaseURL();
  const logoURL = baseURL ? `${baseURL}/journalmate-logo-email.png` : '';
  
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
      .logo-img {
        width: 60px !important;
        height: 60px !important;
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
            <td class="header-padding" style="background-color: #8b5cf6; background-image: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #7c3aed 100%); padding: 50px 40px; text-align: center;">
              ${logoURL ? `<img src="${logoURL}" alt="JournalMate Logo" class="logo-img" style="width: 80px; height: 80px; margin: 0 auto 20px; display: block;" />` : ''}
              <h1 style="margin: 0 0 12px; color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2;">Welcome to JournalMate</h1>
              <p style="margin: 0; color: #e9d5ff; font-size: 18px; font-weight: 500; line-height: 1.4;">Your personal planning companion that adapts to your rhythm</p>
            </td>
          </tr>

          <!-- Personal Message -->
          <tr>
            <td class="content-padding" style="padding: 45px 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 26px; font-weight: 600; line-height: 1.3;">Hey ${firstName}! 👋</h2>
              <p style="margin: 0 0 16px; color: #8b5cf6; font-size: 18px; font-weight: 700; line-height: 1.7;">
                Plan together. Reflect together. Grow together.
              </p>
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.7;">
                Welcome to <strong>JournalMate</strong>—where <strong>adaptive planning</strong>, <strong>emotional intelligence</strong>, and <strong>rhythm-aware journaling</strong> transform your dreams into reality.
              </p>
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.7;">
                Unlike traditional journals that start with blank pages, JournalMate helps you <strong>PLAN first, then REFLECT</strong>.
              </p>
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.7; font-weight: 500;">
                Our rhythm-aware planning engine learns your patterns, adapts in real-time, and turns every goal into an actionable journey.
              </p>
              
              <!-- The Complete Cycle: Visual Flow Diagram -->
              <div style="margin: 30px 0;">
                <h3 style="margin: 0 0 20px; color: #8b5cf6; font-size: 20px; font-weight: 700; text-align: center; line-height: 1.3;">✨ The Complete Cycle</h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                  <tr>
                    <!-- Step 1: Plan -->
                    <td align="center" style="padding: 0 4px 12px;">
                      <div style="background-color: #8b5cf6; background-image: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; padding: 16px 12px; border-radius: 12px; text-align: center; min-height: 100px;">
                        <div style="font-size: 28px; margin-bottom: 8px;">🎯</div>
                        <div style="font-weight: 700; font-size: 16px; margin-bottom: 6px;">PLAN</div>
                        <div style="font-size: 13px; line-height: 1.4;">AI creates personalized tasks</div>
                      </div>
                    </td>
                    <td align="center" width="30" style="color: #8b5cf6; font-size: 24px; font-weight: 700; padding-bottom: 12px;">→</td>
                    <!-- Step 2: Execute -->
                    <td align="center" style="padding: 0 4px 12px;">
                      <div style="background-color: #10b981; background-image: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 12px; border-radius: 12px; text-align: center; min-height: 100px;">
                        <div style="font-size: 28px; margin-bottom: 8px;">✅</div>
                        <div style="font-weight: 700; font-size: 16px; margin-bottom: 6px;">EXECUTE</div>
                        <div style="font-size: 13px; line-height: 1.4;">Swipe & complete activities</div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <!-- Step 3: Reflect -->
                    <td align="center" style="padding: 0 4px 12px;">
                      <div style="background-color: #3b82f6; background-image: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 16px 12px; border-radius: 12px; text-align: center; min-height: 100px;">
                        <div style="font-size: 28px; margin-bottom: 8px;">📸</div>
                        <div style="font-weight: 700; font-size: 16px; margin-bottom: 6px;">REFLECT</div>
                        <div style="font-size: 13px; line-height: 1.4;">Tag photos, give feedback</div>
                      </div>
                    </td>
                    <td align="center" width="30" style="color: #8b5cf6; font-size: 24px; font-weight: 700; padding-bottom: 12px;">→</td>
                    <!-- Step 4: Auto-Journal -->
                    <td align="center" style="padding: 0 4px 12px;">
                      <div style="background-color: #ec4899; background-image: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; padding: 16px 12px; border-radius: 12px; text-align: center; min-height: 100px;">
                        <div style="font-size: 28px; margin-bottom: 8px;">📓</div>
                        <div style="font-weight: 700; font-size: 16px; margin-bottom: 6px;">AUTO-JOURNAL</div>
                        <div style="font-size: 13px; line-height: 1.4;">Built automatically for you</div>
                      </div>
                    </td>
                  </tr>
                </table>
                <p style="text-align: center; margin: 16px 0 0; color: #8b5cf6; font-size: 14px; font-weight: 600; line-height: 1.5;">
                  🔄 Complete the cycle = JournalMate journals FOR YOU (no manual writing!)
                </p>
              </div>
              
              <!-- Privacy & Control Box -->
              <div style="background-color: #f3e8ff; background-image: linear-gradient(135deg, #f3e8ff 0%, #ddd6fe 100%); border-left: 4px solid #8b5cf6; border-radius: 12px; padding: 20px; margin-top: 24px;">
                <p style="margin: 0 0 12px; color: #6b21a8; font-size: 15px; font-weight: 700; line-height: 1.5;">
                  🔒 You're in Control
                </p>
                <p style="margin: 0; color: #5b21b6; font-size: 15px; line-height: 1.6;">
                  <strong>JournalMate only uses what you permit.</strong> You control what's shared publicly, how personalized your plans become, and what information the app can access. Set your priorities and privacy preferences in your Profile—it's the foundation of your experience.
                </p>
              </div>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 2px; background-color: #e5e7eb; background-image: linear-gradient(90deg, transparent, #e5e7eb, transparent);"></div>
            </td>
          </tr>

          <!-- Features Section -->
          <tr>
            <td class="section-padding" style="padding: 35px 40px 20px;">
              <h3 style="margin: 0 0 28px; color: #8b5cf6; font-size: 22px; font-weight: 700; text-align: center; line-height: 1.3;">✨ What Makes JournalMate Different</h3>
              
              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">👤 Your Profile is the Foundation</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Start by setting your priorities (like 'family time', 'career growth', 'health') in your Profile. Define what makes you unique—the app uses this to personalize every plan. Control what's public vs. private with the shield icon. Make it fun and share what you want others to see about you. <strong>The app automatically factors your priorities into every plan</strong> it creates.
                </p>
              </div>
              
              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">🚀 Built for Creators, Planners &amp; Professionals</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Travel agents, event planners, lifestyle creators—this is your platform. <strong>Plan group trips with real-time collaboration</strong>, customize share previews with custom themes and backgrounds, and use the <strong>Privacy Shield</strong> to control what's shared. Choose Public Creator mode (share full details), Privacy-First mode (max protection), or Custom settings—AI automatically redacts names, locations, contact info, and dates as you choose. Your followers can <strong>instantly copy and own your plans</strong> with one click, making it theirs to track and customize.
                </p>
              </div>

              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">🤖 Smart Planning with Live Updates</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Our LangGraph planning agent (not just prompt feeding!) creates personalized plans enriched with <strong>live updates</strong>: traffic conditions, weather forecasts, venue busy-ness, reservation alerts. Planning a romantic date? It factors your profile preferences, detects your mood, sets the tone for success, and lets you share with your date beforehand for perfect alignment. Choose <strong>Smart Plan</strong> for deep personalization with follow-up questions, or <strong>Quick Plan</strong> for fast plans when you need speed.
                </p>
              </div>
              
              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">💬 Create Action Plans with Same-Chatbox Iteration</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Already have plan details? Use 'Create Action Plan' to instantly generate structured tasks. Then keep iterating <strong>in THE SAME chatbox</strong>—no new interface, just describe your changes and the AI refines it. When you receive a shared plan, edit it the same way. Every plan respects your profile priorities automatically.
                </p>
              </div>

              <div class="feature-item" style="margin-bottom: 24px; background-color: #fef3c7; background-image: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; border-radius: 12px; padding: 20px;">
                <h4 style="margin: 0 0 12px; color: #92400e; font-size: 18px; font-weight: 700; line-height: 1.4;">🔄 AUTO-JOURNAL: The Magic Happens Automatically</h4>
                <p style="margin: 0 0 12px; color: #78350f; font-size: 16px; font-weight: 600; line-height: 1.6;">
                  <strong>Here's the secret: As long as you PLAN, EXECUTE, and REFLECT with JournalMate, the app journals FOR YOU.</strong>
                </p>
                <p style="margin: 0 0 12px; color: #78350f; font-size: 15px; line-height: 1.6;">
                  No manual diary writing. No blank pages. Just complete the full cycle:
                </p>
                <ul style="margin: 0 0 12px; padding-left: 20px; color: #78350f; font-size: 15px; line-height: 1.7;">
                  <li style="margin-bottom: 8px;"><strong>PLAN:</strong> AI creates your personalized tasks</li>
                  <li style="margin-bottom: 8px;"><strong>EXECUTE:</strong> Swipe to complete activities, mark progress</li>
                  <li style="margin-bottom: 8px;"><strong>REFLECT:</strong> Tag photos with @keywords (@restaurants, @travel), give thumbs up/down feedback</li>
                  <li><strong>AUTO-JOURNAL:</strong> JournalMate builds your journal automatically from your completions, photos, and feedback</li>
                </ul>
                <p style="margin: 0; color: #92400e; font-size: 15px; font-weight: 600; line-height: 1.6; font-style: italic;">
                  The journal writes itself as you live your life. That's the complete loop. 🔄
                </p>
              </div>
              
              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">🎨 Theme &amp; LLM Integration</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Set your mood or rhythm with theme customization. Adjust color schemes, dark/light mode, and emotional tone. Integrate <strong>any LLM you prefer</strong>—OpenAI, Claude, or others—via copy/paste or backend API integration. Full flexibility to customize the AI experience to match your style and workflow.
                </p>
              </div>

              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">🎯 Instant Copy-and-Own for Followers</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Share your plans with custom visuals, NYC-themed backdrops, or your own media. When friends or followers click your link and sign in, the plan <strong>instantly copies to their account</strong>—they own it, can edit it, and track their own progress. Duplicate detection prevents losing progress when updating existing plans. Perfect for building your following as a creator, planner, or coach.
                </p>
              </div>

              <div class="feature-item" style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 17px; font-weight: 600; line-height: 1.4;">🌍 Browse & Use Community Plans</h4>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Get inspired by <strong>thousands of plans created by others</strong>. Browse trending plans, filter by Travel, Fitness, Events, Career, or Home categories. Found a plan you love? Click <strong>"Use This Plan"</strong> to instantly copy it to your account with all tasks—then customize it to match your rhythm. Perfect for jumpstarting your goals or discovering new ideas from creators, planners, and fellow JournalMate users.
                </p>
              </div>
            </td>
          </tr>

          <!-- Getting Started CTA -->
          <tr>
            <td class="cta-padding" style="padding: 20px 40px 45px;">
              <div class="cta-box" style="background-color: #8b5cf6; background-image: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 35px 30px; border-radius: 16px; text-align: center; box-shadow: 0 6px 20px rgba(139, 92, 246, 0.25);">
                <h3 style="margin: 0 0 18px; color: #ffffff; font-size: 24px; font-weight: 700; line-height: 1.3;">🚀 Getting Started Is Easy</h3>
                <div style="text-align: left; margin: 0 auto; max-width: 450px;">
                  <p style="margin: 0 0 14px; color: #ffffff; font-size: 15px; line-height: 1.6;"><strong style="color: #fde047;">1️⃣</strong> Tap <strong>New Plan</strong> → Try Quick or Smart</p>
                  <p style="margin: 0 0 14px; color: #ffffff; font-size: 15px; line-height: 1.6;"><strong style="color: #fde047;">2️⃣</strong> Browse <strong>Community Plans</strong> for instant inspiration</p>
                  <p style="margin: 0 0 14px; color: #ffffff; font-size: 15px; line-height: 1.6;"><strong style="color: #fde047;">3️⃣</strong> Journal with <strong>@keywords</strong>, photos, or voice</p>
                  <p style="margin: 0 0 14px; color: #ffffff; font-size: 15px; line-height: 1.6;"><strong style="color: #fde047;">4️⃣</strong> Swipe to complete, skip, or reflect</p>
                  <p style="margin: 0; color: #ffffff; font-size: 15px; line-height: 1.6;"><strong style="color: #fde047;">5️⃣</strong> Share your rhythm with friends or groups</p>
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
      subject: `Welcome to JournalMate, ${firstName}! 🎯 Plan Your Next Adventure with Adaptive AI`,
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
