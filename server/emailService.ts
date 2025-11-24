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

// Welcome email template - Elegant HTML with Community Discovery
export function getWelcomeEmailHTML(firstName: string = 'there') {
  const baseURL = getBaseURL();
  const logoURL = baseURL ? `${baseURL}/icons/email/email-logo-512.png` : 'https://resend-attachments.s3.amazonaws.com/nx67BKRdxXaeFoH';
  const appURL = baseURL || 'https://journalmate.ai';
  
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="width=device-width" name="viewport" />
    <link rel="preload" as="image" href="${logoURL}" />
    <link rel="preload" as="image" href="https://img.icons8.com/color/48/twitter--v1.png" />
    <link rel="preload" as="image" href="https://img.icons8.com/color/48/facebook-new.png" />
    <link rel="preload" as="image" href="https://img.icons8.com/color/48/instagram-new--v1.png" />
    <link rel="preload" as="image" href="https://img.icons8.com/color/48/tiktok--v1.png" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
    <style type="text/css">
      @media only screen and (max-width: 600px) {
        .header-padding { padding: 30px 20px !important; }
        .content-padding { padding: 25px 20px !important; }
        .section-padding { padding: 30px 20px !important; }
        .support-padding { padding: 0 20px 30px !important; }
        .trending-card { 
          width: 100% !important; 
          display: block !important; 
          margin-right: 0 !important; 
          margin-bottom: 16px !important; 
        }
        .trending-card:last-child { margin-bottom: 0 !important; }
        h1 { font-size: 24px !important; line-height: 1.3 !important; }
        h2 { font-size: 20px !important; }
        h3 { font-size: 22px !important; line-height: 1.3 !important; }
        .cta-button { 
          padding: 14px 32px !important; 
          font-size: 16px !important; 
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;background-color:#f3f4f6">
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center" style="background-color:#f3f4f6;padding:30px 15px">
      <tbody>
        <tr>
          <td align="center">
            <table class="email-container" width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.08)">
              <tbody>
                <!-- Header -->
                <tr>
                  <td class="header-padding" align="center" style="padding:40px;background:linear-gradient(135deg,#7C3AED 0%,#14B8A6 100%);text-align:center;border-radius:20px 20px 0 0">
                    <img alt="JournalMate Logo" height="80" src="${logoURL}" style="display:block;outline:none;border:none;text-decoration:none;max-width:100%;border-radius:8px;margin:0 auto 15px" width="80" />
                    <h1 style="margin:0;padding:0;font-size:28px;line-height:1.44em;padding-top:0.389em;font-weight:700;color:#ffffff;letter-spacing:0.5px">Welcome to JournalMate</h1>
                    <p style="margin:8px 0 0;padding:0;font-size:16px;padding-top:0.5em;padding-bottom:0.5em;color:rgba(255,255,255,0.95);line-height:1.4">Plan Together. Discover Together. Grow Together.</p>
                  </td>
                </tr>

                <!-- Personal Greeting -->
                <tr>
                  <td style="padding:0">
                    <p style="margin:0;padding:0;font-size:1em;padding-top:0.5em;padding-bottom:0.5em"><br /></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px">
                    <h2 style="margin:0 0 16px;padding:0;font-size:24px;line-height:1.3;padding-top:0.389em;font-weight:700;color:#111827">Hey ${firstName}! 👋</h2>
                  </td>
                </tr>
                <tr>
                  <td class="content-padding" style="padding:0 40px 20px">
                    <p style="margin:0 0 20px;padding:0;font-size:16px;padding-top:0.5em;padding-bottom:0.5em;color:#374151;line-height:1.6"><strong>You're now part of a community that plans smarter, grows together, and never misses life's special moments.</strong></p>
                    <p style="margin:0 0 20px;padding:0;font-size:16px;padding-top:0.5em;padding-bottom:0.5em;color:#374151;line-height:1.6">Welcome to JournalMate—where adaptive planning, emotional intelligence, and rhythm-aware journaling transform your dreams into reality. But that's not all...</p>
                  </td>
                </tr>

                <!-- NEW FEATURES Highlight -->
                <tr>
                  <td class="section-padding" style="padding:40px;background:linear-gradient(135deg,rgba(124,58,237,0.08) 0%,rgba(20,184,166,0.08) 100%)">
                    <div style="text-align:center;margin-bottom:24px">
                      <span style="background:linear-gradient(135deg,#7C3AED 0%,#14B8A6 100%);color:#ffffff;padding:8px 20px;border-radius:24px;font-size:13px;font-weight:700;letter-spacing:0.8px;box-shadow:0 4px 12px rgba(124,58,237,0.25)">✨ NEW FEATURES</span>
                    </div>
                    <h3 style="margin:0 0 16px;padding:0;font-size:26px;line-height:1.2;font-weight:700;color:#111827;text-align:center">🌍 Discover Trending Plans Near You</h3>
                    <p style="margin:0 0 32px;padding:0;font-size:16px;color:#374151;line-height:1.7;text-align:center;max-width:500px;margin-left:auto;margin-right:auto">See what's happening around you in real-time! From <strong style="color:#7C3AED">chasing the Aurora Borealis</strong> to <strong style="color:#14B8A6">weather alerts</strong> like incoming storms, JournalMate keeps you connected to what matters NOW.</p>
                    
                    <!-- Alert Cards with Gradient Borders -->
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px">
                      <tbody>
                        <tr>
                          <td class="trending-card" style="padding:2px;width:48%;display:inline-block;vertical-align:top;margin-right:4%;border-radius:14px;background:linear-gradient(135deg,#7C3AED 0%,#14B8A6 100%)">
                            <div style="padding:20px;background-color:#ffffff;border-radius:12px;height:100%">
                              <div style="font-size:36px;margin-bottom:10px;text-align:center">🌌</div>
                              <h4 style="margin:0 0 8px;padding:0;color:#111827;font-size:17px;font-weight:700;text-align:center">Aurora Alert</h4>
                              <p style="margin:0;padding:0;font-size:14px;color:#6b7280;line-height:1.5;text-align:center">Northern Lights visible tonight in Iceland &amp; Alaska</p>
                            </div>
                          </td>
                          <td class="trending-card" style="padding:2px;width:48%;display:inline-block;vertical-align:top;border-radius:14px;background:linear-gradient(135deg,#14B8A6 0%,#7C3AED 100%)">
                            <div style="padding:20px;background-color:#ffffff;border-radius:12px;height:100%">
                              <div style="font-size:36px;margin-bottom:10px;text-align:center">⚠️</div>
                              <h4 style="margin:0 0 8px;padding:0;color:#111827;font-size:17px;font-weight:700;text-align:center">Storm Warning</h4>
                              <p style="margin:0;padding:0;font-size:14px;color:#6b7280;line-height:1.5;text-align:center">Ice storm expected in Northeast - plan indoor activities</p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:30px">
                      <tbody>
                        <tr>
                          <td class="trending-card" style="padding:2px;width:48%;display:inline-block;vertical-align:top;margin-right:4%;border-radius:14px;background:linear-gradient(135deg,#7C3AED 0%,#14B8A6 100%)">
                            <div style="padding:20px;background-color:#ffffff;border-radius:12px;height:100%">
                              <div style="font-size:36px;margin-bottom:10px;text-align:center">🎪</div>
                              <h4 style="margin:0 0 8px;padding:0;color:#111827;font-size:17px;font-weight:700;text-align:center">Festival Alert</h4>
                              <p style="margin:0;padding:0;font-size:14px;color:#6b7280;line-height:1.5;text-align:center">Coachella tickets on sale this Friday</p>
                            </div>
                          </td>
                          <td class="trending-card" style="padding:2px;width:48%;display:inline-block;vertical-align:top;border-radius:14px;background:linear-gradient(135deg,#14B8A6 0%,#7C3AED 100%)">
                            <div style="padding:20px;background-color:#ffffff;border-radius:12px;height:100%">
                              <div style="font-size:36px;margin-bottom:10px;text-align:center">🎉</div>
                              <h4 style="margin:0 0 8px;padding:0;color:#111827;font-size:17px;font-weight:700;text-align:center">Local Event</h4>
                              <p style="margin:0;padding:0;font-size:14px;color:#6b7280;line-height:1.5;text-align:center">Saturday farmers market - fresh produce &amp; live music</p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <!-- Prominent Discover Button -->
                    <div style="text-align:center;margin-bottom:16px">
                      <a href="${appURL}/discover" class="cta-button" style="color:#ffffff;text-decoration:none;display:inline-block;background:linear-gradient(135deg,#7C3AED 0%,#14B8A6 100%);padding:16px 40px;border-radius:14px;font-size:17px;font-weight:700;box-shadow:0 6px 20px rgba(124,58,237,0.35);letter-spacing:0.3px">🌟 Discover Community Plans</a>
                    </div>
                    
                    <p style="margin:0;padding:0;font-size:15px;color:#6b7280;line-height:1.6;text-align:center">Plus: <strong style="color:#111827">Every activity comes with a clickable link</strong> 🔗 so you can jump directly to your plans, share them instantly, and track progress from anywhere!</p>
                  </td>
                </tr>

                <!-- Getting Started CTA -->
                <tr>
                  <td class="section-padding" style="padding:40px;background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)">
                    <h3 style="margin:0 0 20px;padding:0;font-size:24px;line-height:1.08em;padding-top:0.389em;font-weight:700;color:#ffffff;text-align:center">🚀 Getting Started Is Easy</h3>
                    <ol style="margin:0;padding:0;padding-left:25px;color:#ffffff;font-size:15px;line-height:1.8">
                      <li style="margin:0 0 10px"><strong>Create Your First Plan</strong> → Try Quick Plan or Smart Plan</li>
                      <li style="margin:0 0 10px"><strong>Explore Trending Plans</strong> near you for instant inspiration</li>
                      <li style="margin:0 0 10px"><strong>Browse Community Plans</strong> and copy ones you love</li>
                      <li style="margin:0 0 10px"><strong>Journal with @keywords</strong>, photos, or voice notes</li>
                      <li style="margin:0 0 10px"><strong>Share your rhythm</strong> with friends or groups</li>
                      <li style="margin:0"><strong>Swipe to complete</strong>, skip, or reflect on activities</li>
                    </ol>
                    <div style="padding:15px 0;text-align:center">
                      <a href="${appURL}/dashboard" style="color:#ffffff;text-decoration:none;display:inline-block;background:linear-gradient(135deg,#14B8A6 0%,#0D9488 100%);padding:16px 36px;border-radius:12px;font-size:17px;font-weight:700;box-shadow:0 4px 12px rgba(20,184,166,0.3)">Start Planning with JournalMate</a>
                    </div>
                  </td>
                </tr>

                <!-- Community Stats -->
                <tr>
                  <td class="section-padding" style="padding:25px 40px;background:linear-gradient(135deg,#F3F4F6 0%,#E5E7EB 100%)">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tbody>
                        <tr>
                          <td align="center" style="padding:15px;width:33%;text-align:center">
                            <div style="font-size:32px;font-weight:700;color:#7C3AED;margin-bottom:5px">10K+</div>
                            <div style="font-size:14px;color:#6b7280;font-weight:600">Active Planners</div>
                          </td>
                          <td align="center" style="padding:15px;width:33%;text-align:center;border-left:2px solid #D1D5DB;border-right:2px solid #D1D5DB">
                            <div style="font-size:32px;font-weight:700;color:#14B8A6;margin-bottom:5px">50K+</div>
                            <div style="font-size:14px;color:#6b7280;font-weight:600">Community Plans</div>
                          </td>
                          <td align="center" style="padding:15px;width:33%;text-align:center">
                            <div style="font-size:32px;font-weight:700;color:#F59E0B;margin-bottom:5px">98%</div>
                            <div style="font-size:14px;color:#6b7280;font-weight:600">Satisfaction Rate</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                <!-- Support Box -->
                <tr>
                  <td class="support-padding" style="padding:0 40px 40px">
                    <div style="padding:28px;background-color:#f9fafb;border-radius:12px;border:2px solid #e5e7eb;text-align:center">
                      <p style="margin:0 0 10px;padding:0;font-size:16px;padding-top:0.5em;padding-bottom:0.5em;color:#374151;font-weight:600;line-height:1.4">Need help or want to share feedback?</p>
                      <p style="margin:0;padding:0;font-size:15px;padding-top:0.5em;padding-bottom:0.5em;color:#6b7280;line-height:1.5">We're here for you: <a href="mailto:support@journalmate.ai" style="color:#8b5cf6;text-decoration:none;font-weight:600">support@journalmate.ai</a></p>
                    </div>
                  </td>
                </tr>

                <!-- Footer with Social Media -->
                <tr>
                  <td align="center" style="padding:35px 40px;background-color:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;border-radius:0 0 20px 20px">
                    <p style="margin:0 0 8px;padding:0;font-size:18px;padding-top:0.5em;padding-bottom:0.5em;color:#111827;font-weight:600;letter-spacing:0.5px;line-height:1.4">Welcome to the rhythm. 💫</p>
                    <p style="margin:0 0 16px;padding:0;font-size:15px;padding-top:0.5em;padding-bottom:0.5em;color:#6b7280;line-height:1.5">Made with ❤️ by <strong>JournalMate</strong></p>
                    
                    <!-- Social Media Icons - CLICKABLE -->
                    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 16px">
                      <tbody>
                        <tr>
                          <td style="padding:0 8px">
                            <a href="https://twitter.com/journalmate_ai" target="_blank" style="text-decoration:none">
                              <img alt="Twitter" src="https://img.icons8.com/color/48/twitter--v1.png" style="display:block;outline:none;border:none;text-decoration:none;max-width:100%;border-radius:8px;width:32px;height:32px" width="32" height="32" />
                            </a>
                          </td>
                          <td style="padding:0 8px">
                            <a href="https://www.facebook.com/profile.php?id=61583966435460" target="_blank" style="text-decoration:none">
                              <img alt="Facebook" src="https://img.icons8.com/color/48/facebook-new.png" style="display:block;outline:none;border:none;text-decoration:none;max-width:100%;border-radius:8px;width:32px;height:32px" width="32" height="32" />
                            </a>
                          </td>
                          <td style="padding:0 8px">
                            <a href="https://www.instagram.com/journalmate.ai/" target="_blank" style="text-decoration:none">
                              <img alt="Instagram" src="https://img.icons8.com/color/48/instagram-new--v1.png" style="display:block;outline:none;border:none;text-decoration:none;max-width:100%;border-radius:8px;width:32px;height:32px" width="32" height="32" />
                            </a>
                          </td>
                          <td style="padding:0 8px">
                            <a href="https://www.tiktok.com/@dtanaruno" target="_blank" style="text-decoration:none">
                              <img alt="TikTok" src="https://img.icons8.com/color/48/tiktok--v1.png" style="display:block;outline:none;border:none;text-decoration:none;max-width:100%;border-radius:8px;width:32px;height:32px" width="32" height="32" />
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <p style="margin:0;padding:0;font-size:13px;padding-top:0.5em;padding-bottom:0.5em;color:#9ca3af;line-height:1.5">© 2025 JournalMate. All rights reserved.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}


// Pro subscription welcome email with benefits glossary
export function getProWelcomeEmailHTML(firstName: string = 'there') {
  const baseURL = getBaseURL();
  const logoURL = baseURL ? `${baseURL}/icons/email/email-logo-512.png` : 'https://resend-attachments.s3.amazonaws.com/nx67BKRdxXaeFoH';
  const appURL = baseURL || 'https://journalmate.ai';
  
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="width=device-width" name="viewport" />
    <link rel="preload" as="image" href="${logoURL}" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <style type="text/css">
      @media only screen and (max-width: 600px) {
        .header-padding { padding: 30px 20px !important; }
        .content-padding { padding: 25px 20px !important; }
        .section-padding { padding: 30px 20px !important; }
        h1 { font-size: 24px !important; line-height: 1.3 !important; }
        h2 { font-size: 20px !important; }
        .benefit-card { margin-bottom: 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;background-color:#f3f4f6">
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center" style="background-color:#f3f4f6;padding:30px 15px">
      <tbody>
        <tr>
          <td align="center">
            <table class="email-container" width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.08)">
              <tbody>
                <!-- Header with Pro Badge -->
                <tr>
                  <td class="header-padding" align="center" style="padding:40px;background:linear-gradient(135deg,#7C3AED 0%,#14B8A6 100%);text-align:center;border-radius:20px 20px 0 0">
                    <img alt="JournalMate Logo" height="80" src="${logoURL}" style="display:block;outline:none;border:none;text-decoration:none;max-width:100%;border-radius:8px;margin:0 auto 15px" width="80" />
                    <div style="margin-bottom:15px">
                      <span style="background:rgba(255,255,255,0.25);color:#ffffff;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:0.8px;border:1px solid rgba(255,255,255,0.4)">PRO MEMBER</span>
                    </div>
                    <h1 style="margin:0;padding:0;font-size:28px;line-height:1.44em;font-weight:700;color:#ffffff;letter-spacing:0.5px">Welcome to JournalMate Pro!</h1>
                    <p style="margin:8px 0 0;padding:0;font-size:16px;color:rgba(255,255,255,0.95);line-height:1.4">Thank you for upgrading. You're now unlocked!</p>
                  </td>
                </tr>

                <!-- Personal Greeting -->
                <tr>
                  <td class="content-padding" style="padding:35px 40px 25px">
                    <h2 style="margin:0 0 16px;padding:0;font-size:24px;line-height:1.3;font-weight:700;color:#111827">Hey ${firstName}!</h2>
                    <p style="margin:0 0 16px;padding:0;font-size:16px;color:#374151;line-height:1.6">Thank you for upgrading to <strong style="color:#7C3AED">JournalMate Pro</strong>! You now have unlimited access to our most powerful planning features.</p>
                    <p style="margin:0;padding:0;font-size:16px;color:#374151;line-height:1.6">Let's explore everything you can do now:</p>
                  </td>
                </tr>

                <!-- Benefits Glossary -->
                <tr>
                  <td class="section-padding" style="padding:0 40px 30px">
                    <h3 style="margin:0 0 24px;padding:0;font-size:22px;font-weight:700;color:#111827;text-align:center">Your Pro Benefits</h3>
                    
                    <!-- Benefit 1: Unlimited Plans -->
                    <div class="benefit-card" style="margin-bottom:24px;padding:24px;background:linear-gradient(135deg,rgba(124,58,237,0.08) 0%,rgba(20,184,166,0.08) 100%);border-radius:12px;border:2px solid rgba(124,58,237,0.15)">
                      <div style="margin-bottom:12px">
                        <h4 style="margin:0 0 8px;padding:0;font-size:18px;font-weight:700;color:#7C3AED">Unlimited AI Plans</h4>
                        <p style="margin:0;padding:0;font-size:15px;color:#374151;line-height:1.6">Create as many plans as you want with Quick Plan or Smart Plan. No monthly limits. Plan your entire life!</p>
                      </div>
                    </div>

                    <!-- Benefit 2: Smart Favorites -->
                    <div class="benefit-card" style="margin-bottom:24px;padding:24px;background:linear-gradient(135deg,rgba(245,158,11,0.08) 0%,rgba(251,191,36,0.08) 100%);border-radius:12px;border:2px solid rgba(245,158,11,0.15)">
                      <div style="margin-bottom:12px">
                        <h4 style="margin:0 0 8px;padding:0;font-size:18px;font-weight:700;color:#F59E0B">Smart Favorites</h4>
                        <p style="margin:0;padding:0;font-size:15px;color:#374151;line-height:1.6">Save your favorite community plans and activities. Access them instantly whenever you need inspiration.</p>
                      </div>
                    </div>

                    <!-- Benefit 3: Journal Insights -->
                    <div class="benefit-card" style="margin-bottom:24px;padding:24px;background:linear-gradient(135deg,rgba(20,184,166,0.08) 0%,rgba(6,182,212,0.08) 100%);border-radius:12px;border:2px solid rgba(20,184,166,0.15)">
                      <div style="margin-bottom:12px">
                        <h4 style="margin:0 0 8px;padding:0;font-size:18px;font-weight:700;color:#14B8A6">AI-Powered Journal Insights</h4>
                        <p style="margin:0;padding:0;font-size:15px;color:#374151;line-height:1.6">Get personalized insights from your journal entries. Discover patterns, track moods, and understand your growth over time.</p>
                      </div>
                    </div>

                    <!-- Benefit 4: Export & Backup -->
                    <div class="benefit-card" style="margin-bottom:24px;padding:24px;background:linear-gradient(135deg,rgba(99,102,241,0.08) 0%,rgba(139,92,246,0.08) 100%);border-radius:12px;border:2px solid rgba(99,102,241,0.15)">
                      <div style="margin-bottom:12px">
                        <h4 style="margin:0 0 8px;padding:0;font-size:18px;font-weight:700;color:#6366F1">Export & Backup</h4>
                        <p style="margin:0;padding:0;font-size:15px;color:#374151;line-height:1.6">Download your plans, tasks, and journal entries in PDF or JSON format. Your data, your way.</p>
                      </div>
                    </div>

                    <!-- Benefit 5: Group Planning -->
                    <div class="benefit-card" style="margin-bottom:24px;padding:24px;background:linear-gradient(135deg,rgba(236,72,153,0.08) 0%,rgba(219,39,119,0.08) 100%);border-radius:12px;border:2px solid rgba(236,72,153,0.15)">
                      <div style="margin-bottom:12px">
                        <h4 style="margin:0 0 8px;padding:0;font-size:18px;font-weight:700;color:#EC4899">Group Planning & Collaboration</h4>
                        <p style="margin:0;padding:0;font-size:15px;color:#374151;line-height:1.6">Create groups with friends, family, or teams. Share activities, track collective progress, and celebrate together!</p>
                      </div>
                    </div>

                    <!-- Benefit 6: Priority Support -->
                    <div class="benefit-card" style="padding:24px;background:linear-gradient(135deg,rgba(16,185,129,0.08) 0%,rgba(5,150,105,0.08) 100%);border-radius:12px;border:2px solid rgba(16,185,129,0.15)">
                      <div style="margin-bottom:12px">
                        <h4 style="margin:0 0 8px;padding:0;font-size:18px;font-weight:700;color:#10B981">Priority Support</h4>
                        <p style="margin:0;padding:0;font-size:15px;color:#374151;line-height:1.6">Get faster responses from our support team. We're here to help you make the most of JournalMate!</p>
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- Get Started CTA -->
                <tr>
                  <td class="section-padding" style="padding:35px 40px;background:linear-gradient(135deg,#7C3AED 0%,#14B8A6 100%)">
                    <h3 style="margin:0 0 16px;padding:0;font-size:24px;font-weight:700;color:#ffffff;text-align:center">Ready to unlock your potential?</h3>
                    <p style="margin:0 0 24px;padding:0;font-size:16px;color:rgba(255,255,255,0.95);line-height:1.6;text-align:center">Start using your Pro benefits today!</p>
                    <div style="text-align:center">
                      <a href="${appURL}/dashboard" style="color:#ffffff;text-decoration:none;display:inline-block;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.4);padding:16px 40px;border-radius:12px;font-size:17px;font-weight:700;backdrop-filter:blur(10px)">Start Planning Now</a>
                    </div>
                  </td>
                </tr>

                <!-- Support -->
                <tr>
                  <td style="padding:30px 40px">
                    <div style="padding:24px;background-color:#f9fafb;border-radius:12px;border:2px solid #e5e7eb;text-align:center">
                      <p style="margin:0 0 8px;padding:0;font-size:16px;color:#374151;font-weight:600">Questions or feedback?</p>
                      <p style="margin:0;padding:0;font-size:15px;color:#6b7280">We're here to help: <a href="mailto:support@journalmate.ai" style="color:#7C3AED;text-decoration:none;font-weight:600">support@journalmate.ai</a></p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding:30px 40px;background-color:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;border-radius:0 0 20px 20px">
                    <p style="margin:0 0 8px;padding:0;font-size:18px;color:#111827;font-weight:600">Welcome to the Pro life.</p>
                    <p style="margin:0;padding:0;font-size:15px;color:#6b7280">Made with love by <strong>JournalMate</strong></p>
                    <p style="margin:16px 0 0;padding:0;font-size:13px;color:#9ca3af">© 2025 JournalMate. All rights reserved.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
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
      subject: `Welcome to JournalMate, ${firstName}! 🌍 Discover What's Trending Near You`,
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

export async function sendProWelcomeEmail(email: string, firstName: string = 'there') {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [email],
      subject: `🎉 Welcome to JournalMate Pro, ${firstName}! Your Benefits Inside`,
      html: getProWelcomeEmailHTML(firstName),
    });

    if (error) {
      console.error('[EMAIL] Failed to send Pro welcome email:', error);
      return { success: false, error };
    }

    console.log('[EMAIL] Pro welcome email sent successfully:', { email, emailId: data?.id });
    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('[EMAIL] Error sending Pro welcome email:', error);
    return { success: false, error };
  }
}
