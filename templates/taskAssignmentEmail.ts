
export const taskAssignmentEmail = (
    employeeName: string,
    taskTitle: string,
    projectName: string | null,
    description: string,
    priority: string,
    dueDate: string,
    assignedBy: string = "Admin"
) => {
    // Calculate days remaining
    const due = new Date(dueDate);
    const now = new Date();
    // Reset hours to compare dates only
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let timeStatus = "";
    if (diffDays < 0) {
        timeStatus = `<span style="color: #ef4444; font-weight: bold;">Overdue by ${Math.abs(diffDays)} days</span>`;
    } else if (diffDays === 0) {
        timeStatus = `<span style="color: #f59e0b; font-weight: bold;">Due Today</span>`;
    } else {
        timeStatus = `<span style="color: #10b981; font-weight: bold;">${diffDays} Days Remaining</span>`;
    }

    const priorityColor = priority === 'High' ? '#ef4444' : priority === 'Medium' ? '#f59e0b' : '#3b82f6';
    const projectDisplay = projectName ? projectName : 'General Task';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Task Assigned: ${taskTitle}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
        .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { background-color: #0f172a; padding: 30px; text-align: center; border-bottom: 4px solid #3b82f6; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
        .content { padding: 40px 30px; }
        .task-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
        .label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; display: block; }
        .value { font-size: 16px; color: #1e293b; font-weight: 500; margin-bottom: 15px; }
        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: white; background-color: ${priorityColor}; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .btn { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        @media only screen and (max-width: 600px) {
            .grid { grid-template-columns: 1fr; }
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
            <h1>New Task Assigned</h1>
        </div>
        <div class="content">
            <p style="font-size: 16px;">Hello <strong>${employeeName}</strong>,</p>
            <p style="color: #475569; margin-bottom: 25px;">You have been assigned a new task by ${assignedBy}. Please review the details below:</p>

            <div class="task-card">
                <div style="margin-bottom: 20px;">
                    <span class="label">Task Title</span>
                    <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${taskTitle}</div>
                </div>

                <div class="grid">
                    <div>
                        <span class="label">Project</span>
                        <div class="value">${projectDisplay}</div>
                    </div>
                    <div>
                        <span class="label">Priority</span>
                        <div style="margin-bottom: 15px;"><span class="priority-badge">${priority}</span></div>
                    </div>
                </div>

                <div class="grid">
                    <div>
                        <span class="label">Due Date</span>
                        <div class="value">${new Date(dueDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <span class="label">Time Remaining</span>
                        <div class="value">${timeStatus}</div>
                    </div>
                </div>

                <div>
                    <span class="label">Description</span>
                    <div style="color: #475569; font-size: 15px; line-height: 1.6; background: #fff; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        ${description.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/user/tasks" class="btn">View Task Dashboard</a>
            </div>
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
