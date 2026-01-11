import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface SendMailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    from?: string;
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async ({ to, subject, text, html, from }: SendMailOptions) => {
    try {
        const companyName = "Auto Computation";

        const sender = from || `"${companyName}" <sujaykumarkotal49@gmail.com>`;

        const info = await transporter.sendMail({
            from: sender,
            to: to,
            subject: subject,
            text: text,
            html: html,
        });

        console.log("Message sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email: ", error);
        throw error;
    }
};
