import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface SendMailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async ({ to, subject, text, html, from, attachments }: SendMailOptions) => {
    try {
        const companyName = "Auto Computation";

        const sender = from || `"${companyName}" <${process.env.SMTP_USER}>`;

        const info = await transporter.sendMail({
            from: sender,
            to: to,
            subject: subject,
            text: text,
            html: html,
            attachments: attachments,
        });

        console.log("Message sent: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Error sending email: ", error);
        throw error;
    }
};
