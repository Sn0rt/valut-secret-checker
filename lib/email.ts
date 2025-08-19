import nodemailer from 'nodemailer';
import { serverDebug, serverError } from './server-logger';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface UnwrapNotificationData {
  timestamp: string;
  endpoint: string;
  success: boolean;
  userAgent?: string;
  ipAddress?: string;
}

interface EmailSendResult {
  success: number;
  failed: number;
  details: string[];
}

// Check if SMTP is configured
export function isSmtpConfigured(): boolean {
  return !!process.env.SMTP_HOST && 
         process.env.SMTP_HOST !== 'smtp.example.com';
}

// Parse multiple email addresses (support comma and space separators)
export function parseEmailAddresses(emailString: string): string[] {
  if (!emailString) return [];
  
  return emailString
    .split(/[,\s]+/)
    .map(email => email.trim())
    .filter(email => email && isValidEmail(email));
}

// Create transporter based on environment variables
function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '25'),
    secure: process.env.SMTP_SECURE === 'true', // true for SSL/TLS
    auth: undefined as { user: string; pass: string } | undefined
  };

  // Add authentication if credentials are provided
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    };
  }

  return nodemailer.createTransport(config);
}

// Validate email address format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Send email notification
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Validate email address
    if (!isValidEmail(options.to)) {
      serverError('Invalid email address format:', options.to);
      return false;
    }

    const transporter = createTransporter();
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@example.com';

    const mailOptions = {
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    serverDebug('Sending email:', {
      to: options.to,
      subject: options.subject,
      from: fromEmail
    });

    const result = await transporter.sendMail(mailOptions);
    
    serverDebug('Email sent successfully:', {
      messageId: result.messageId,
      to: options.to
    });

    return true;
  } catch (error) {
    serverError('Failed to send email:', error);
    return false;
  }
}

// Send unwrap notification email to multiple recipients
export async function sendUnwrapNotification(
  emailString: string,
  data: UnwrapNotificationData
): Promise<EmailSendResult> {
  const result: EmailSendResult = {
    success: 0,
    failed: 0,
    details: []
  };

  // Check if SMTP is configured
  if (!isSmtpConfigured()) {
    serverDebug('SMTP not configured, skipping email notification');
    result.details.push('SMTP not configured');
    return result;
  }

  // Parse email addresses
  const emails = parseEmailAddresses(emailString);
  
  if (emails.length === 0) {
    serverDebug('No valid email addresses found');
    result.details.push('No valid email addresses found');
    return result;
  }

  serverDebug(`Sending unwrap notification to ${emails.length} recipients:`, emails);

  const subject = `Token Unwrap Notification - ${data.success ? 'Success' : 'Failed'}`;
  
  const textContent = `
Token Unwrap Notification

Status: ${data.success ? 'SUCCESS' : 'FAILED'}
Timestamp: ${data.timestamp}
Endpoint: ${data.endpoint}
User Agent: ${data.userAgent || 'Unknown'}
IP Address: ${data.ipAddress || 'Unknown'}

This notification was generated automatically by the Vault Secret Checker system.
`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Token Unwrap Notification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${data.success ? '#10b981' : '#ef4444'}; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .label { font-weight: bold; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Token Unwrap Notification</h2>
            <p>Status: ${data.success ? 'SUCCESS' : 'FAILED'}</p>
        </div>
        
        <div class="content">
            <div class="info-row">
                <span class="label">Timestamp:</span>
                <span>${data.timestamp}</span>
            </div>
            <div class="info-row">
                <span class="label">Endpoint:</span>
                <span>${data.endpoint}</span>
            </div>
            <div class="info-row">
                <span class="label">User Agent:</span>
                <span>${data.userAgent || 'Unknown'}</span>
            </div>
            <div class="info-row">
                <span class="label">IP Address:</span>
                <span>${data.ipAddress || 'Unknown'}</span>
            </div>
        </div>
        
        <div class="footer">
            <p>This notification was generated automatically by the Vault Secret Checker system.</p>
        </div>
    </div>
</body>
</html>
`;

  // Send email to each recipient
  for (const email of emails) {
    try {
      const success = await sendEmail({
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
      
      if (success) {
        result.success++;
        result.details.push(`Successfully sent to ${email}`);
      } else {
        result.failed++;
        result.details.push(`Failed to send to ${email}`);
      }
    } catch (error) {
      result.failed++;
      result.details.push(`Error sending to ${email}: ${error}`);
      serverError(`Failed to send email to ${email}:`, error);
    }
  }

  serverDebug('Email notification results:', result);
  return result;
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    serverDebug('SMTP configuration is valid');
    return true;
  } catch (error) {
    serverError('SMTP configuration test failed:', error);
    return false;
  }
}