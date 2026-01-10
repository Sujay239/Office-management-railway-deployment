// templates/resetPasswordEmail.js

const getResetPasswordHtml = (resetLink: string) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        /* General styles */
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background-color: #4F46E5; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; background-color: #4F46E5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .footer { background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }
        .link-text { word-break: break-all; color: #4F46E5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
        <div style="text-align: center;">
            <img src="https://autocomputation.com/wp-content/uploads/2025/07/autocomputation-logo.png" alt="Auto Computation Logo" style="width: 150px; height: auto;">
        </div>
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <p>To reset your password, click the button below:</p>

          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>

          <p style="margin-top: 30px; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p><a href="${resetLink}" class="link-text">${resetLink}</a></p>

          <p style="margin-top: 20px; font-size: 13px; color: #666;">This link will expire in 10 minutes.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default getResetPasswordHtml;
