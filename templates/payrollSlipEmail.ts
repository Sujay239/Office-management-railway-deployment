
export const payrollSlipEmail = (
    employeeName: string,
    month: string,
    basicSalary: number,
    allowances: number,
    deductions: number,
    netSalary: number,
    paymentDate: string,
    dashboardLink: string
) => {
    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payslip Notification</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
        .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; text-align: center; } /* Emerald green for money/success */
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { color: #d1fae5; margin: 5px 0 0; font-size: 14px; }
        .content { padding: 40px 30px; }
        .summary-card { background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center; }
        .summary-label { font-size: 12px; text-transform: uppercase; color: #059669; font-weight: 600; letter-spacing: 1px; }
        .summary-amount { font-size: 32px; color: #064e3b; font-weight: 700; margin: 5px 0; font-family: 'Consolas', monospace; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .details-table th, .details-table td { padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .details-table th { text-align: left; color: #64748b; font-weight: 500; }
        .details-table td { text-align: right; color: #1e293b; font-weight: 600; }
        .details-table tr:last-child td { border-bottom: none; }
        .positive { color: #059669; }
        .negative { color: #ef4444; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .btn { display: inline-block; background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; font-size: 14px; transition: background-color 0.2s; }
        .btn:hover { background-color: #047857; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
        <div style="text-align: center;">
            <img src="https://autocomputation.com/wp-content/uploads/2025/07/autocomputation-logo.png" alt="Auto Computation Logo" style="width: 150px; height: auto;">
        </div>
            <h1>Salary Credited 💸</h1>
            <p>Your salary for ${month} has been processed</p>
        </div>
        <div class="content">
            <p style="font-size: 16px;">Dear <strong>${employeeName}</strong>,</p>
            <p>We are pleased to inform you that your salary payment for the month of <strong>${month}</strong> has been successfully processed and credited.</p>

            <div class="summary-card">
                <div class="summary-label">Net Pay</div>
                <div class="summary-amount">${formatCurrency(netSalary)}</div>
                <div style="font-size: 12px; color: #065f46;">Processed on ${new Date(paymentDate).toLocaleDateString()}</div>
            </div>

            <table class="details-table">
                <tr>
                    <th>Basic Salary</th>
                    <td>${formatCurrency(basicSalary)}</td>
                </tr>
                <tr>
                    <th>Allowances</th>
                    <td class="positive">+ ${formatCurrency(allowances)}</td>
                </tr>
                <tr>
                    <th>Deductions</th>
                    <td class="negative">- ${formatCurrency(deductions)}</td>
                </tr>
                <tr style="border-top: 2px solid #cbd5e1;">
                    <th style="padding-top: 15px; color: #1e293b; font-weight: 700;">Total Net Payable</th>
                    <td style="padding-top: 15px; font-size: 18px; color: #059669;">${formatCurrency(netSalary)}</td>
                </tr>
            </table>

            <p style="text-align: center; margin-top: 30px;">
                You can view detailed breakdown and download your payslip from your dashboard.
            </p>

            <div style="text-align: center;">
                <a href="${dashboardLink}" class="btn">View Payslip</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Auto Computation. All rights reserved.</p>
            <p>This is an automated message. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
    `;
};
