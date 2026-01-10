
export const welcomeEmployeeEmail = (
    employeeName: string,
    employeeEmail: string,
    adminName: string,
    dashboardLink: string,
    password: string,
    designation: string,
    joiningDate: string,
    employmentType: string
) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to the Team</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
        .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px; }
        .header p { color: #94a3b8; margin: 10px 0 0; font-size: 16px; }
        .content { padding: 40px 30px; }
        .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 25px 0; }
        .label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
        .value { font-size: 16px; color: #1e293b; font-weight: 500; font-family: 'Consolas', monospace; background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #cbd5e1; display: inline-block; }
        .note { color: #64748b; font-size: 14px; margin-top: 15px; font-style: italic; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .btn { display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); transition: background-color 0.2s; }
        .btn:hover { background-color: #2563eb; }
        .divider { height: 1px; background-color: #e2e8f0; margin: 30px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">

            <h1>Welcome Aboard to the team of Auto Computation! 🎉</h1>
            <p>We are excited to have you join us</p>
        </div>
        <div class="content">
            <p style="font-size: 16px; color: #334155;">Hello <strong>${employeeName}</strong>,</p>
            <p style="margin-bottom: 25px;">You have been officially added to the <strong>Auto Computation</strong> by <strong>${adminName}</strong>.</p>

            <p>You can now access your employee dashboard to view tasks, announcements, and more. Here are your login credentials and details:</p>

            <div class="card">
                <div style="margin-bottom: 20px;">
                    <span class="label">Email Address / Username</span>
                    <div class="value">${employeeEmail}</div>
                </div>

                <div style="margin-bottom: 20px;">
                    <span class="label">Password</span>
                    <div style="font-size: 15px; color: #334155;">
                        Your temporary password is: <strong>${password}</strong>
                    </div>
                    <div class="note">Please log in and change your password immediately.</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                     <div>
                        <span class="label">Designation</span>
                        <div style="color: #1e293b; font-weight: 500;">${designation}</div>
                     </div>
                     <div>
                        <span class="label">Employment Type</span>
                        <div style="color: #1e293b; font-weight: 500;">${employmentType}</div>
                     </div>
                     <div style="grid-column: span 2;">
                        <span class="label">Joining Date</span>
                        <div style="color: #1e293b; font-weight: 500;">${new Date(joiningDate).toLocaleDateString()}</div>
                     </div>
                </div>
            </div>

            <p style="text-align: center;">Click the button below to log in and get started:</p>

            <div style="text-align: center;">
                <a href="${dashboardLink}" class="btn">Access Dashboard</a>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #64748b; text-align: center;">
                For security, we recommend changing your password immediately after your first login.
            </p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Auto Computation. All rights reserved.</p>
            <p>Please do not reply to this automated email.</p>
        </div>
    </div>
</body>
</html>
    `;
};
