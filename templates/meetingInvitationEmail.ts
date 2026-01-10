
export const meetingInvitationEmail = (
    participantName: string,
    adminName: string,
    meetingTitle: string,
    meetingDescription: string,
    startTime: string,
    endTime: string,
    joinUrl: string
) => {
    // Format dates for better readability
    const start = new Date(startTime);
    const end = new Date(endTime);

    const dateString = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeString = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Invitation</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
        .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { color: #94a3b8; margin: 10px 0 0; font-size: 16px; }
        .content { padding: 40px 30px; }
        .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #3b82f6; }
        .label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; display: block; }
        .value { font-size: 16px; color: #1e293b; font-weight: 500; font-family: 'Consolas', monospace; }
        .description-box { background-color: #fff; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 5px; color: #475569; font-size: 14px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .btn { display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3); transition: background-color 0.2s; text-align: center; }
        .btn:hover { background-color: #2563eb; }
        .divider { height: 1px; background-color: #e2e8f0; margin: 30px 0; }
        .meeting-icon { font-size: 40px; margin-bottom: 10px; display: block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
           <div style="text-align: center;">
                <img src="https://autocomputation.com/wp-content/uploads/2025/07/autocomputation-logo.png" alt="Auto Computation Logo" style="width: 150px; height: auto;">
            </div>
            <img src="https://static.vecteezy.com/system/resources/previews/065/855/878/large_2x/email-and-calendar-icon-free-png.png" alt="Calendar" class="meeting-icon" style="width: 40px; height: 40px; margin: 0 auto;">
            <h1>Meeting Invitation</h1>
            <p>You have been invited to a new meeting</p>
        </div>
        <div class="content">
            <p style="font-size: 16px; color: #334155;">Hello <strong>${participantName}</strong>,</p>
            <p><strong>${adminName}</strong> has scheduled a meeting and invited you to attend.</p>

            <div class="card">
                <div style="margin-bottom: 20px;">
                    <span class="label">Topic</span>
                    <div class="value" style="font-size: 18px; font-weight: 700; color: #0f172a;">${meetingTitle}</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 20px;">
                     <div>
                        <span class="label">Date & Time</span>
                        <div class="value">${dateString}</div>
                        <div class="value" style="color: #64748b; font-size: 14px;">${timeString}</div>
                     </div>
                </div>

                ${meetingDescription ? `
                <div style="margin-bottom: 5px;">
                    <span class="label">Agenda / Description</span>
                    <div class="description-box">
                        ${meetingDescription}
                    </div>
                </div>
                ` : ''}
            </div>

            <p style="text-align: center; margin-bottom: 5px;">Join the meeting using the link below:</p>

            <div style="text-align: center;">
                <a href="${joinUrl}" class="btn" target="_blank">Join Meeting</a>
            </div>

            <div style="text-align: center; margin-top: 15px;">
                 <a href="${joinUrl}" style="font-size: 12px; color: #94a3b8; word-break: break-all;">${joinUrl}</a>
            </div>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #64748b; text-align: center; font-style: italic;">
                Please ensure you are on time. If you cannot make it, please inform the organizer.
            </p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Auto Computation. All rights reserved.</p>
            <p>123 Business Road, Tech City, TC 12345</p>
        </div>
    </div>
</body>
</html>
    `;
};
