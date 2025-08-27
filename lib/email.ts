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
  response?: unknown;
}

interface EmailSendResult {
  success: number;
  failed: number;
  details: string[];
}

interface NetworkError extends Error {
  code?: string;        // Error codes like ESOCKET, ECONNREFUSED, EDNS, etc.
  errno?: number;       // Error number
  syscall?: string;     // System call
  hostname?: string;    // Hostname
  address?: string;     // IP address  
  port?: number;        // Port number
  command?: string;     // SMTP command
}

// Helper function to safely get error code
function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code) || 'Unknown error';
  }
  return 'Unknown error';
}

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error';
}

// Check if SMTP is configured
export function isSmtpConfigured(): boolean {
  return !!process.env.SMTP_HOST &&
    process.env.SMTP_HOST !== 'smtp.example.com' &&
    process.env.SMTP_HOST !== 'xxx.example.com'; // Add invalid example hostname
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
    auth: undefined as { user: string; pass: string } | undefined,
    // For debugging servers, disable some checks
    ignoreTLS: true,
    requireTLS: false,
    // Add debugging and timeout options
    debug: process.env.DEBUG === 'true',
    logger: process.env.DEBUG === 'true',
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,    // 5 seconds
    socketTimeout: 10000      // 10 seconds
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

    // Test connection first
    serverDebug('Testing SMTP connection...');
    try {
      await transporter.verify();
      serverDebug('SMTP connection verified successfully');
    } catch (verifyError) {
      serverError('SMTP connection verification failed:', verifyError);
      // Try to continue anyway, sometimes verify() fails but sendMail works
    }

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
    serverError('Failed to send email:', {
      to: options.to,
      subject: options.subject,
      error: getErrorCode(error)
    });
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

  // Get configurable app title
  const appTitle = process.env.NEXT_PUBLIC_APP_TITLE || 'Vault Secret Checker';

  // Format response data for display
  const responseData = data.response ? JSON.stringify(data.response, null, 2) : 'No response data available';

  const textContent = `Token Unwrap Notification

Status: ${data.success ? 'SUCCESS' : 'FAILED'}
Timestamp: ${data.timestamp}
Endpoint: ${data.endpoint}
User Agent: ${data.userAgent || 'Unknown'}
IP Address: ${data.ipAddress || 'Unknown'}

Response Data:
${responseData}

This notification was generated automatically by the ${appTitle} system.`;

  // Send email to each recipient
  for (const email of emails) {
    try {
      const success = await sendEmail({
        to: email,
        subject,
        text: textContent
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
    serverDebug('Testing email configuration...');

    const transporter = createTransporter();

    // First test the connection
    serverDebug('Verifying SMTP connection...');
    await transporter.verify();

    serverDebug('SMTP configuration is valid');
    return true;
  } catch (error) {
    serverError('SMTP configuration test failed:', {
      errorCode: getErrorCode(error),
      errorMessage: getErrorMessage(error)
    });
    return false;
  }
}