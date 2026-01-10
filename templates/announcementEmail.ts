
export const announcementEmail = (title: string, message: string, priority: string = 'Normal') => {
    const priorityColor = priority === 'High' ? '#ef4444' : priority === 'Medium' ? '#f59e0b' : '#3b82f6';
    const importanceLabel = priority === 'Normal' ? '' : `<span style="background-color: ${priorityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; vertical-align: middle;">${priority} Importance</span>`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
        .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background-color: #0f172a; padding: 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
        .content { padding: 40px 30px; }
        .title-section { border-bottom: 2px solid #f4f4f5; padding-bottom: 20px; margin-bottom: 20px; }
        .content h2 { color: #1e293b; margin-top: 0; font-size: 20px; display: flex; align-items: center; gap: 10px; }
        .message-body { color: #475569; font-size: 16px; white-space: pre-wrap; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .btn { display: inline-block; background-color: #0f172a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
            .content { padding: 20px !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="text-align: center;">
                <img src="https://autocomputation.com/wp-content/uploads/2025/07/autocomputation-logo.png" alt="Auto Computation Logo" style="width: 150px; height: auto;">
            </div>
            <h1>Official Announcement</h1>
        </div>
        <div class="content">
            <div class="title-section">
                <h2>${title} ${importanceLabel}</h2>
            </div>
            <div class="message-body">
                ${message.replace(/\n/g, '<br>')}
            </div>

            <p style="margin-top: 30px; font-style: italic; color: #64748b;">
                This represents an official communication from the administration.
            </p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Office Management System. All rights reserved.</p>
            <p>Please do not reply to this automated email.</p>
        </div>
    </div>
</body>
</html>
    `;
};
