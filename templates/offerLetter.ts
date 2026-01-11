// export const offerLetterTemplate = (
//     employeeName: string,
//     role: string,
//     joiningDate: string,
//     compensation: string,
//     adminName: string,
//     adminRole: string,
//     employeeAddress: string
// ) => {
//     // Current date for the letter
//     const formattedDate = new Date().toLocaleDateString('en-US', {
//         year: 'numeric',
//         month: 'long',
//         day: 'numeric',
//     });

//     const startDateFormat = new Date(joiningDate).toLocaleDateString('en-US', {
//         year: 'numeric',
//         month: 'long',
//         day: 'numeric',
//     });

//     const companyLogo = "https://autocomputation.com/wp-content/uploads/2025/07/autocomputation-logo.png";

//     return `
// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset="utf-8">
//     <title>Job Offer Letter</title>
//     <style>
//         @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

//         @page {
//             size: A4;
//             margin: 0;
//         }

//         * { box-sizing: border-box; }

//         html, body {
//             width: 210mm;
//             height: 297mm;
//         }

//         body {
//             font-family: 'Montserrat', sans-serif;
//             margin: 0;
//             padding: 0;
//             color: #334155;
//             background: #fff;
//             position: relative;
//             overflow: hidden; /* Force single page view clipping */
//         }


//         .header-bg {
//             position: absolute;
//             top: 0; left: 0; width: 100%;
//             height: 140px; /* Kept large as requested */
//             z-index: -1;
//         }

//         .footer-bg {
//             position: absolute;
//             bottom: 0; left: 0; width: 100%;
//             height: 100px; /* Slightly reduced from 120px to save space */
//             z-index: -1;
//         }

//         .container {
//             padding: 10px 45px; /* Reduced vertical padding */
//             position: relative;
//             z-index: 10;
//         }
//         .top-header {
//             display: flex;
//             justify-content: flex-end;
//             align-items: center;
//             margin-top: 5px;
//             margin-bottom: 10px; /* Reduced */
//         }

//         .logo-container {
//             text-align: right; display: flex; align-items: center; gap: 10px;
//         }

//         .logo-img { height: 40px; }

//         .main-title {
//             text-align: center;
//             font-size: 22px; /* Slightly smaller */
//             font-weight: 700;
//             color: #0891b2;
//             text-transform: uppercase;
//             letter-spacing: 1px;
//             margin-top: 5px;
//             margin-bottom: 15px; /* Reduced */
//         }

//         .info-row {
//             display: flex; justify-content: space-between; align-items: flex-start;
//             margin-bottom: 10px; /* Reduced */
//             font-size: 11px; /* Smaller font */
//         }

//         .recipient-info p { margin: 1px 0; }
//         .recipient-name { font-weight: 700; font-size: 13px; color: #1e293b; }

//         .content {
//             font-size: 11px; /* Smaller font to fit everything */
//             line-height: 1.4;
//             color: #475569;
//         }

//         .content p { margin: 6px 0; } /* Tighter paragraphs */

//         .salutation { font-weight: 700; color: #1e293b; margin-bottom: 5px; }

//         .details-list { margin: 8px 0; padding-left: 15px; }
//         .details-list li { margin-bottom: 3px; list-style-type: disc; }
//         .highlight { font-weight: 600; color: #1e293b; }


//         .signature-section {
//             margin-top: 15px; /* Reduced */
//             text-align: right;
//             display: flex; flex-direction: column; align-items: flex-end;
//         }

//         .admin-name { font-weight: 700; color: #1e293b; margin-top: 2px; }
//         .admin-role { font-size: 10px; color: #64748b; }


//         .contact-footer {
//             position: absolute;
//             bottom: 25px; /* Adjusted position */
//             left: 45px;
//             font-size: 9px;
//             color: #334155;
//             z-index: 10;
//         }
//         .contact-item { display: flex; align-items: center; gap: 5px; margin-bottom: 2px; }
//         .icon-circle {
//             background-color: #0891b2; color: white; width: 14px; height: 14px;
//             border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 8px;
//         }
//     </style>
// </head>
// <body>

//     <div class="header-bg">
//         <svg viewBox="0 0 500 150" preserveAspectRatio="none" style="height: 100%; width: 100%;">
//             <defs>
//                 <pattern id="dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
//                     <circle cx="2" cy="2" r="1" style="fill: #94a3b8; opacity: 0.3;"></circle>
//                 </pattern>
//             </defs>
//             <rect x="350" y="0" width="150" height="100" fill="url(#dots)" />
//             <path d="M0,0 L0,80 C150,120 250,20 400,30 C450,35 500,60 500,60 L500,0 Z" fill="#0e7490"></path>
//             <path d="M0,0 L0,50 C180,90 280,0 420,10 C460,15 500,40 500,40 L500,0 Z" fill="#22d3ee" opacity="0.4"></path>
//         </svg>
//     </div>

//     <div class="container">
//         <div class="top-header">
//             <div class="logo-container">
//                 <img src="${companyLogo}" alt="Logo" class="logo-img">
//             </div>
//         </div>

//         <div class="main-title">JOB OFFER LETTER</div>

//         <div class="info-row">
//             <div class="recipient-info">
//                 <p style="font-size: 10px; color: #64748b; font-weight: bold;">To:</p>
//                 <p class="recipient-name">${employeeName}</p>
//                 <p style="max-width: 250px;">${employeeAddress}</p>
//             </div>
//             <div class="date-info">
//                 <p>${formattedDate}</p>
//             </div>
//         </div>

//         <div class="content">
//             <p class="salutation">Dear ${employeeName},</p>

//             <p>We are delighted to offer you the position of <strong>${role}</strong> at Auto Computation. Your creativity, skills, and passion for design will be a valuable addition to our team.</p>

//             <p>Please note that the first three months of your employment will be a probationary period for the evaluation of your performance. Upon successful completion and review of your performance during this period, your employment status will be confirmed as permanent.</p>

//             <p style="margin-top: 8px; margin-bottom: 4px;">Details of the Offer:</p>
//             <ul class="details-list">
//                 <li><span class="highlight">Position:</span> ${role}</li>
//                 <li><span class="highlight">Start Date:</span> ${startDateFormat}</li>
//                 <li><span class="highlight">Work Location:</span> Rupsha Apartment ground floor, Near Lokenath Mandir, Chinar Park, Kolkata - 700052</li>
//                 <li><span class="highlight">Salary:</span> ${compensation}</li>
//             </ul>

//             <p>We are confident that your contribution will help us grow and achieve new creative milestones. Please confirm your acceptance by replying to this letter before ${startDateFormat}.</p>

//             <div class="signature-section">
//                 <p>Sincerely,</p>
//                 <div style="font-family: 'Brush Script MT', cursive; font-size: 24px; color: #334155; margin: 3px 0;">${adminName}</div>
//                 <div class="admin-name">${adminName}</div>
//                 <div class="admin-role">${adminRole}</div>
//             </div>
//         </div>
//     </div>

//     <div class="contact-footer">
//         <div class="contact-item">
//             <div class="icon-circle">📞</div>
//             <span>+91 9876543210</span>
//         </div>
//         <div class="contact-item">
//             <div class="icon-circle">✉</div>
//             <span>autocomputation123@gmail.com</span>
//         </div>
//         <div class="contact-item">
//             <div class="icon-circle">📍</div>
//             <span>Near Lokenath Mandir, Chinar Park, Kolkata - 700052</span>
//         </div>
//     </div>

//     <div class="footer-bg">
//         <svg viewBox="0 0 500 150" preserveAspectRatio="none" style="height: 100%; width: 100%;">
//             <path d="M0,150 L500,150 L500,60 C350,20 250,120 100,100 C50,95 0,70 0,70 Z" fill="#0e7490"></path>
//              <path d="M0,150 L500,150 L500,90 C320,50 220,140 80,120 C40,115 0,90 0,90 Z" fill="#22d3ee" opacity="0.4"></path>
//         </svg>
//     </div>

// </body>
// </html>
//     `;
// };
