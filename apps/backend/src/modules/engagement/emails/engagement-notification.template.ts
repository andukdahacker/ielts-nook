import { escapeHtml } from "../../logistics/emails/format-utils.js";

export type AchievementType = "streak" | "personal-best" | "combined";

interface EngagementEmailParams {
  studentName: string;
  centerName: string;
  achievementType: AchievementType;
  score?: number | null;
  dashboardUrl: string;
  locale: "en" | "vi";
  unsubscribeUrl?: string;
}

export function buildEngagementEmail(
  params: EngagementEmailParams,
): { subject: string; html: string } {
  const { achievementType, score, dashboardUrl, locale } = params;

  const centerName = escapeHtml(params.centerName);
  const studentName = escapeHtml(params.studentName);

  const subject = buildSubject(achievementType, params.studentName, locale);
  const heading = buildHeading(achievementType, locale);
  const body = buildBody(achievementType, studentName, score, locale);
  const buttonText = locale === "vi" ? "Xem Trang Cá Nhân" : "View My Dashboard";
  const footer =
    locale === "vi"
      ? `Bạn nhận được email này vì bạn là thành viên của ${centerName}.`
      : `You received this email because you are a member of ${centerName}.`;

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
            <td style="padding:32px;text-align:center;">
              <h2 style="margin:0 0 16px;font-size:24px;color:#18181b;">${heading}</h2>
              ${body}

              <table cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
                <tr>
                  <td style="background-color:#2563EB;border-radius:6px;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${buttonText}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f4f4f5;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">${footer}</p>
${params.unsubscribeUrl ? `              <p style="margin:8px 0 0;font-size:12px;color:#a1a1aa;text-align:center;">
                <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline;">
                  ${locale === "vi" ? "Huy dang ky nhan thong bao" : "Unsubscribe from these notifications"}
                </a>
              </p>` : ""}
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

function buildSubject(
  achievementType: AchievementType,
  studentName: string,
  locale: "en" | "vi",
): string {
  if (locale === "vi") {
    switch (achievementType) {
      case "streak":
        return `${studentName} đã đạt chuỗi 7 ngày học liên tiếp!`;
      case "personal-best":
        return `${studentName} đã đạt điểm cao nhất mới!`;
      case "combined":
        return `${studentName} đã đạt chuỗi 7 ngày và điểm cao nhất mới!`;
    }
  }
  switch (achievementType) {
    case "streak":
      return `${studentName} hit a 7-day study streak!`;
    case "personal-best":
      return `${studentName} achieved a new Personal Best!`;
    case "combined":
      return `${studentName} hit a 7-day streak and a new Personal Best!`;
  }
}

function buildHeading(
  achievementType: AchievementType,
  locale: "en" | "vi",
): string {
  if (locale === "vi") {
    switch (achievementType) {
      case "streak":
        return "&#127942; Chuỗi 7 Ngày Học Liên Tiếp!";
      case "personal-best":
        return "&#11088; Điểm Cao Nhất Mới!";
      case "combined":
        return "&#127942;&#11088; Thành Tích Đặc Biệt!";
    }
  }
  switch (achievementType) {
    case "streak":
      return "&#127942; 7-Day Study Streak!";
    case "personal-best":
      return "&#11088; New Personal Best!";
    case "combined":
      return "&#127942;&#11088; Double Achievement!";
  }
}

function buildBody(
  achievementType: AchievementType,
  studentName: string,
  score: number | null | undefined,
  locale: "en" | "vi",
): string {
  const parts: string[] = [];

  if (achievementType === "streak" || achievementType === "combined") {
    const streakMsg =
      locale === "vi"
        ? `<strong>${studentName}</strong> đã hoàn thành bài tập 7 ngày liên tiếp. Hãy tiếp tục phát huy!`
        : `<strong>${studentName}</strong> has completed assignments for 7 consecutive days. Keep up the great work!`;
    parts.push(
      `<p style="margin:0 0 12px;font-size:16px;color:#18181b;">${streakMsg}</p>`,
    );
  }

  if (achievementType === "personal-best" || achievementType === "combined") {
    const scoreText = score != null ? ` — ${score}` : "";
    const pbMsg =
      locale === "vi"
        ? `<strong>${studentName}</strong> vừa đạt điểm cao nhất từ trước đến nay${scoreText}. Tuyệt vời!`
        : `<strong>${studentName}</strong> just achieved their highest score ever${scoreText}. Amazing!`;
    parts.push(
      `<p style="margin:0 0 12px;font-size:16px;color:#18181b;">${pbMsg}</p>`,
    );
  }

  return parts.join("\n              ");
}
