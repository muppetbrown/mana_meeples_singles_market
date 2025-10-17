// @ts-expect-error TS(1208): 'emailService.ts' cannot be compiled under '--isol... Remove this comment to see the full error message
const nodemailer = require('nodemailer');

class EmailService {
  isConfigured: any;
  transporter: any;
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if email configuration is provided
      const emailConfig = {
        host: process.env.SMTP_HOST,
        // @ts-expect-error TS(2345): Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      };

      // Skip email configuration if no SMTP settings are provided
      if (!emailConfig.host || !emailConfig.auth.user || !emailConfig.auth.pass) {
        console.log('📧 Email service not configured - SMTP settings missing');
        console.log('📧 To enable emails, set SMTP_HOST, SMTP_USER, SMTP_PASSWORD environment variables');
        return;
      }

      this.transporter = nodemailer.createTransporter(emailConfig);
      this.isConfigured = true;
      console.log('✅ Email service configured successfully');

      // Verify SMTP connection configuration
      this.transporter.verify()
        .then(() => {
          console.log('✅ SMTP server connection verified');
        })
        .catch((error: any) => {
          console.error('❌ SMTP server connection failed:', error.message);
          this.isConfigured = false;
        });

    } catch (error) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      console.error('❌ Email service initialization failed:', error.message);
      this.isConfigured = false;
    }
  }

  async sendOrderConfirmationToCustomer(orderData: any) {
    if (!this.isConfigured) {
      console.log('📧 Skipping customer email - email service not configured');
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      const { customer, items, total, currency, order_id } = orderData;

      // Generate order items HTML
      const itemsHtml = items.map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">
            <div style="font-weight: 600; color: #1f2937;">${item.name}</div>
            <div style="font-size: 14px; color: #6b7280;">${item.quality}</div>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">
            ${currency}${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>
      `).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Order Confirmed!</h1>
              <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">Thank you for your purchase</p>
            </div>

            <!-- Content -->
            <div style="padding: 32px 24px;">
              <!-- Customer Info -->
              <div style="margin-bottom: 24px;">
                <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 16px;">Hello ${customer.firstName}!</h2>
                <p style="color: #4b5563; margin: 0; line-height: 1.6;">
                  We've received your order and are excited to get your cards to you! Here are the details:
                </p>
              </div>

              <!-- Order Details -->
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Order #${order_id}</h3>

                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #e5e7eb;">
                      <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Item</th>
                      <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Qty</th>
                      <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #374151;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>

                <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #3b82f6;">
                  <div style="text-align: right; font-size: 18px; font-weight: 700; color: #1f2937;">
                    Total: ${currency}${total.toFixed(2)}
                  </div>
                </div>
              </div>

              <!-- Shipping Address -->
              <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 12px;">Shipping Address</h3>
                <div style="color: #4b5563; line-height: 1.6;">
                  ${customer.firstName} ${customer.lastName}<br>
                  ${customer.address}<br>
                  ${customer.suburb ? customer.suburb + '<br>' : ''}
                  ${customer.city}, ${customer.region || ''} ${customer.postalCode}<br>
                  ${customer.country}
                </div>
              </div>

              <!-- Payment Instructions -->
              <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #92400e; font-size: 18px; font-weight: 600; margin: 0 0 12px;">⚡ Payment Instructions</h3>
                <p style="color: #92400e; margin: 0 0 12px; font-weight: 600;">
                  Your cards are reserved! Please complete payment to secure your order.
                </p>
                <p style="color: #92400e; margin: 0; line-height: 1.6;">
                  We'll send you bank account details and payment instructions within 24 hours.
                  ${customer.country !== 'New Zealand' ? 'Alternative payment methods available for international customers.' : ''}
                </p>
              </div>

              ${customer.notes ? `
              <!-- Order Notes -->
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 8px;">Order Notes</h3>
                <p style="color: #4b5563; margin: 0; font-style: italic;">"${customer.notes}"</p>
              </div>
              ` : ''}

              <!-- Contact Info -->
              <div style="text-align: center; color: #6b7280; font-size: 14px; line-height: 1.6;">
                <p style="margin: 0;">Questions about your order? Contact us at:</p>
                <p style="margin: 4px 0 0; font-weight: 600; color: #3b82f6;">
                  ${process.env.OWNER_EMAIL || 'support@manameeplescards.com'}
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #1f2937; color: #d1d5db; text-align: center; padding: 20px;">
              <p style="margin: 0; font-size: 14px;">
                © ${new Date().getFullYear()} Mana Meeples Cards - Premium TCG Singles
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: customer.email,
        subject: `Order Confirmation #${order_id} - Your TCG Singles Order`,
        html: emailHtml,
        text: `
Order Confirmed! Thank you for your purchase.

Order #${order_id}

Items:
${items.map((item: any) => `- ${item.name} (${item.quality}) x${item.quantity} - ${currency}${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Total: ${currency}${total.toFixed(2)}

Shipping Address:
${customer.firstName} ${customer.lastName}
${customer.address}
${customer.suburb ? customer.suburb + '\n' : ''}${customer.city}, ${customer.region || ''} ${customer.postalCode}
${customer.country}

Payment instructions will be sent within 24 hours.

Questions? Contact us at ${process.env.OWNER_EMAIL || 'support@manameeplescards.com'}
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Customer confirmation email sent to ${customer.email}`);
      return { success: true };

    } catch (error) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      console.error('❌ Failed to send customer confirmation email:', error.message);
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      return { success: false, error: error.message };
    }
  }

  async sendOrderNotificationToOwner(orderData: any) {
    if (!this.isConfigured) {
      console.log('📧 Skipping owner email - email service not configured');
      return { success: false, reason: 'Email service not configured' };
    }

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
      console.log('📧 Skipping owner email - OWNER_EMAIL not configured');
      return { success: false, reason: 'Owner email not configured' };
    }

    try {
      const { customer, items, total, currency, order_id, timestamp } = orderData;

      // Generate order items HTML for owner (with more details)
      const itemsHtml = items.map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">
            <div style="font-weight: 600; color: #1f2937;">${item.name}</div>
            <div style="font-size: 14px; color: #6b7280;">
              ${item.quality} • SKU: ${item.inventory_id || 'N/A'}
            </div>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">
            ${currency}${item.price.toFixed(2)} each
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">
            ${currency}${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>
      `).join('');

      const ownerEmailHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order Received</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 700px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🎉 New Order Received!</h1>
              <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">Order #${order_id}</p>
            </div>

            <!-- Content -->
            <div style="padding: 32px 24px;">
              <!-- Order Summary -->
              <div style="background-color: #ecfdf5; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                  <h2 style="color: #065f46; font-size: 20px; font-weight: 600; margin: 0;">Order Details</h2>
                  <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: 700; color: #065f46;">${currency}${total.toFixed(2)}</div>
                    <div style="font-size: 14px; color: #059669;">${items.length} item${items.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <p style="color: #065f46; margin: 0; font-size: 14px;">
                  Received: ${new Date(timestamp).toLocaleString()}
                </p>
              </div>

              <!-- Customer Information -->
              <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Customer Information</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                    <div style="color: #6b7280; font-size: 14px; font-weight: 600; margin-bottom: 4px;">NAME</div>
                    <div style="color: #1f2937; font-weight: 600;">${customer.firstName} ${customer.lastName}</div>
                  </div>
                  <div>
                    <div style="color: #6b7280; font-size: 14px; font-weight: 600; margin-bottom: 4px;">EMAIL</div>
                    <div style="color: #1f2937;"><a href="mailto:${customer.email}" style="color: #3b82f6;">${customer.email}</a></div>
                  </div>
                  ${customer.phone ? `
                  <div>
                    <div style="color: #6b7280; font-size: 14px; font-weight: 600; margin-bottom: 4px;">PHONE</div>
                    <div style="color: #1f2937;"><a href="tel:${customer.phone}" style="color: #3b82f6;">${customer.phone}</a></div>
                  </div>
                  ` : ''}
                  <div>
                    <div style="color: #6b7280; font-size: 14px; font-weight: 600; margin-bottom: 4px;">COUNTRY</div>
                    <div style="color: #1f2937;">${customer.country}</div>
                  </div>
                </div>

                <!-- Shipping Address -->
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <div style="color: #6b7280; font-size: 14px; font-weight: 600; margin-bottom: 8px;">SHIPPING ADDRESS</div>
                  <div style="color: #1f2937; line-height: 1.6;">
                    ${customer.address}<br>
                    ${customer.suburb ? customer.suburb + '<br>' : ''}
                    ${customer.city}, ${customer.region || ''} ${customer.postalCode}<br>
                    ${customer.country}
                  </div>
                </div>
              </div>

              <!-- Order Items -->
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 16px;">Order Items</h3>

                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #e5e7eb;">
                      <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Item</th>
                      <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Qty</th>
                      <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #374151;">Unit Price</th>
                      <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #374151;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>

                <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #059669;">
                  <div style="text-align: right; font-size: 20px; font-weight: 700; color: #1f2937;">
                    Order Total: ${currency}${total.toFixed(2)}
                  </div>
                </div>
              </div>

              ${customer.notes ? `
              <!-- Order Notes -->
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 8px;">📝 Customer Notes</h3>
                <p style="color: #92400e; margin: 0; font-style: italic;">"${customer.notes}"</p>
              </div>
              ` : ''}

              <!-- Action Items -->
              <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; border-left: 4px solid #ef4444;">
                <h3 style="color: #dc2626; font-size: 18px; font-weight: 600; margin: 0 0 12px;">⚡ Action Required</h3>
                <ul style="color: #dc2626; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Send payment instructions to customer</li>
                  <li>Reserve inventory items</li>
                  <li>Update order status when payment received</li>
                  <li>Prepare shipment once payment confirmed</li>
                </ul>
              </div>

              <!-- Quick Actions -->
              <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px;">
                  Order management available in admin dashboard
                </p>
                <a href="mailto:${customer.email}?subject=Payment%20Instructions%20-%20Order%20%23${order_id}"
                   style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  Send Payment Instructions
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #1f2937; color: #d1d5db; text-align: center; padding: 20px;">
              <p style="margin: 0; font-size: 14px;">
                Mana Meeples Cards - Admin Notification
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const ownerMailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: ownerEmail,
        subject: `🎉 New Order #${order_id} - ${currency}${total.toFixed(2)} from ${customer.firstName} ${customer.lastName}`,
        html: ownerEmailHtml,
        text: `
New Order Received! #${order_id}

Customer: ${customer.firstName} ${customer.lastName}
Email: ${customer.email}
Phone: ${customer.phone || 'Not provided'}
Country: ${customer.country}

Shipping Address:
${customer.address}
${customer.suburb ? customer.suburb + '\n' : ''}${customer.city}, ${customer.region || ''} ${customer.postalCode}
${customer.country}

Order Items:
${items.map((item: any) => `- ${item.name} (${item.quality}) x${item.quantity} - ${currency}${item.price.toFixed(2)} each = ${currency}${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Total: ${currency}${total.toFixed(2)}
Order Time: ${new Date(timestamp).toLocaleString()}

${customer.notes ? `Customer Notes: "${customer.notes}"` : ''}

ACTION REQUIRED:
- Send payment instructions to customer
- Reserve inventory items
- Update order status when payment received
- Prepare shipment once payment confirmed
        `
      };

      await this.transporter.sendMail(ownerMailOptions);
      console.log(`✅ Owner notification email sent to ${ownerEmail}`);
      return { success: true };

    } catch (error) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      console.error('❌ Failed to send owner notification email:', error.message);
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      return { success: false, error: error.message };
    }
  }

  async sendOrderEmails(orderData: any) {
    const results = {
      customerEmail: { success: false },
      ownerEmail: { success: false }
    };

    // Send both emails in parallel
    const [customerResult, ownerResult] = await Promise.all([
      this.sendOrderConfirmationToCustomer(orderData),
      this.sendOrderNotificationToOwner(orderData)
    ]);

    results.customerEmail = customerResult;
    results.ownerEmail = ownerResult;

    const successCount = (customerResult.success ? 1 : 0) + (ownerResult.success ? 1 : 0);
    console.log(`📧 Email summary: ${successCount}/2 emails sent successfully`);

    return results;
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;