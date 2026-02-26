import { escapeHtml } from "../../logistics/emails/format-utils.js";

interface ParentWelcomeEmailParams {
  studentName: string | null;
  centerName: string;
  locale: "en" | "vi";
  unsubscribeUrl: string;
}

export function buildParentWelcomeEmail(
  params: ParentWelcomeEmailParams,
): { subject: string; html: string } {
  const centerName = escapeHtml(params.centerName);
  const studentName = params.studentName
    ? escapeHtml(params.studentName)
    : params.locale === "vi"
      ? "học sinh"
      : "your student";

  const subject =
    params.locale === "vi"
      ? `Chào mừng đến thông báo phụ huynh ${params.centerName}`
      : `Welcome to ${params.centerName} Parent Notifications`;

  const heading =
    params.locale === "vi"
      ? "Chào mừng Phụ huynh!"
      : "Welcome, Parent!";

  const bodyText =
    params.locale === "vi"
      ? `Bạn đã được đăng ký là phụ huynh/người giám hộ của <strong>${studentName}</strong> tại ${centerName}.`
      : `You have been registered as a parent/guardian contact for <strong>${studentName}</strong> at ${centerName}.`;

  const whatYouReceiveHeading =
    params.locale === "vi"
      ? "Bạn sẽ nhận được:"
      : "You will receive:";

  const items =
    params.locale === "vi"
      ? [
          "Thông báo thành tích (chuỗi 7 ngày, điểm cao nhất cá nhân)",
          "Cập nhật quan trọng từ giáo viên về tiến trình học tập",
        ]
      : [
          "Achievement celebrations (7-day streaks, personal bests)",
          "Important updates from teachers about their child's progress",
        ];

  const footer =
    params.locale === "vi"
      ? `Bạn nhận được email này vì quản trị viên tại ${centerName} đã đăng ký email của bạn.`
      : `You received this email because an administrator at ${centerName} registered your email.`;

  const unsubscribeText =
    params.locale === "vi"
      ? "Hủy đăng ký nhận thông báo"
      : "Unsubscribe from these notifications";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:#2563EB;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${centerName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:24px;color:#18181b;">${heading}</h2>
              <p style="margin:0 0 16px;font-size:16px;color:#18181b;">${bodyText}</p>
              <p style="margin:0 0 8px;font-size:14px;color:#52525b;font-weight:600;">${whatYouReceiveHeading}</p>
              <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#52525b;">
                ${items.map((item) => `<li style="margin:0 0 4px;">${item}</li>`).join("\n                ")}
              </ul>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f4f4f5;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">${footer}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#a1a1aa;text-align:center;">
                <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline;">${unsubscribeText}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
