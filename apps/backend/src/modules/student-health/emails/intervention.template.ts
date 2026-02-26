import {
  escapeHtml,
} from "../../logistics/emails/format-utils.js";

interface InterventionEmailParams {
  studentName: string;
  centerName: string;
  senderName: string;
  attendanceRate: number;
  attendedSessions: number;
  totalSessions: number;
  assignmentCompletionRate: number;
  completedAssignments: number;
  totalAssignments: number;
  overdueAssignments: number;
  healthStatus: "at-risk" | "warning" | "on-track";
  classes: string[];
  locale: "en" | "vi";
  unsubscribeUrl?: string;
}

type ColorScheme = { bg: string; border: string };

function getMetricColor(status: "at-risk" | "warning" | "on-track"): ColorScheme {
  switch (status) {
    case "at-risk":
      return { bg: "#fef2f2", border: "#ef4444" };
    case "warning":
      return { bg: "#fffbeb", border: "#f59e0b" };
    case "on-track":
      return { bg: "#f0fdf4", border: "#10b981" };
  }
}

function getAttendanceColor(rate: number): ColorScheme {
  if (rate < 80) return getMetricColor("at-risk");
  if (rate < 90) return getMetricColor("warning");
  return getMetricColor("on-track");
}

function getCompletionColor(rate: number): ColorScheme {
  if (rate < 50) return getMetricColor("at-risk");
  if (rate < 75) return getMetricColor("warning");
  return getMetricColor("on-track");
}

function getOverdueColor(count: number): ColorScheme {
  if (count > 0) return getMetricColor("at-risk");
  return getMetricColor("on-track");
}

interface SubjectParams {
  templateUsed: string;
  studentName: string;
  centerName: string;
  locale: "en" | "vi";
}

function buildSubject(params: SubjectParams): string {
  const { templateUsed, studentName, centerName, locale } = params;

  if (locale === "vi") {
    switch (templateUsed) {
      case "concern-attendance":
        return `Lo ngai ve tinh hinh di hoc cua ${studentName} — ${centerName}`;
      case "concern-assignments":
        return `Lo ngai ve bai tap cua ${studentName} — ${centerName}`;
      default:
        return `Lo ngai ve tien do cua ${studentName} — ${centerName}`;
    }
  }

  switch (templateUsed) {
    case "concern-attendance":
      return `Concern About ${studentName}'s Attendance — ${centerName}`;
    case "concern-assignments":
      return `Concern About ${studentName}'s Assignments — ${centerName}`;
    default:
      return `Concern About ${studentName}'s Progress — ${centerName}`;
  }
}

interface BodyIntroParams {
  templateUsed: string;
  studentName: string;
  centerName: string;
  locale: "en" | "vi";
}

function buildIntro(params: BodyIntroParams): string {
  const { templateUsed, studentName, centerName, locale } = params;

  if (locale === "vi") {
    switch (templateUsed) {
      case "concern-attendance":
        return `Toi viet thu nay de chia se ve tinh hinh di hoc gan day cua ${studentName} tai ${centerName}.`;
      case "concern-assignments":
        return `Toi viet thu nay de chia se ve tinh hinh bai tap gan day cua ${studentName} tai ${centerName}.`;
      default:
        return `Toi viet thu nay de chia se ve tien do gan day cua ${studentName} tai ${centerName}.`;
    }
  }

  switch (templateUsed) {
    case "concern-attendance":
      return `I'm writing to share an update about ${studentName}'s recent attendance at ${centerName}.`;
    case "concern-assignments":
      return `I'm writing to share an update about ${studentName}'s recent assignment progress at ${centerName}.`;
    default:
      return `I'm writing to share an update about ${studentName}'s recent progress at ${centerName}.`;
  }
}

export function buildInterventionEmailSubject(
  templateUsed: string,
  studentName: string,
  centerName: string,
  locale: "en" | "vi",
): string {
  return buildSubject({ templateUsed, studentName, centerName, locale });
}

export function buildInterventionEmailBody(
  params: InterventionEmailParams,
  templateUsed: string,
): string {
  const {
    locale,
    attendanceRate,
    attendedSessions,
    totalSessions,
    assignmentCompletionRate,
    completedAssignments,
    totalAssignments,
    overdueAssignments,
    healthStatus,
    classes,
  } = params;

  const studentName = escapeHtml(params.studentName);
  const centerName = escapeHtml(params.centerName);
  const senderName = escapeHtml(params.senderName);

  const intro = buildIntro({ templateUsed, studentName, centerName, locale });
  const greeting = locale === "vi" ? "Xin chao," : "Hi,";

  const attColor = getAttendanceColor(attendanceRate);
  const compColor = getCompletionColor(assignmentCompletionRate);
  const overdueColor = getOverdueColor(overdueAssignments);

  const attendanceLabel = locale === "vi" ? "Di hoc" : "Attendance";
  const completionLabel = locale === "vi" ? "Hoan thanh bai tap" : "Assignment Completion";
  const overdueLabel = locale === "vi" ? "Bai tap qua han" : "Overdue Assignments";
  const classesLabel = locale === "vi" ? "Lop dang hoc" : "Enrolled Classes";

  const statusLabel =
    healthStatus === "at-risk"
      ? locale === "vi"
        ? "Co nguy co"
        : "At Risk"
      : healthStatus === "warning"
        ? locale === "vi"
          ? "Canh bao"
          : "Warning"
        : locale === "vi"
          ? "On dinh"
          : "On Track";

  const closingText =
    locale === "vi"
      ? `${studentName} hien dang duoc danh dau la <strong>${statusLabel}</strong> dua tren cac chi so nay. Toi rat mong duoc trao doi voi anh/chi ve cach ho tro ${studentName} tot hon.`
      : `${studentName} is currently flagged as <strong>${statusLabel}</strong> based on these metrics. I'd love to discuss how we can work together to support them.`;

  const ctaText =
    locale === "vi"
      ? "Xin dung ngai lien he neu anh/chi muon sap xep mot cuoc trao doi."
      : "Please don't hesitate to reach out if you'd like to schedule a conversation.";

  const regards = locale === "vi" ? "Tran trong," : "Best regards,";
  const footerText =
    locale === "vi"
      ? `Ban nhan duoc email nay vi con ban la hoc sinh tai ${centerName}.`
      : `You received this email because your child is a student at ${centerName}.`;

  const classesHtml =
    classes.length > 0
      ? classes.map((c) => escapeHtml(c)).join(", ")
      : locale === "vi"
        ? "Khong co"
        : "None";

  return `<!DOCTYPE html>
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
              <p style="margin:0 0 16px;font-size:16px;color:#18181b;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:16px;color:#18181b;">${intro}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
                <tr>
                  <td style="padding:10px 16px;background-color:${attColor.bg};border-left:4px solid ${attColor.border};">
                    <p style="margin:0;font-size:14px;">${attendanceLabel}: <strong>${attendanceRate}%</strong> (${attendedSessions}/${totalSessions} ${locale === "vi" ? "buoi" : "sessions"})</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:10px 16px;background-color:${compColor.bg};border-left:4px solid ${compColor.border};">
                    <p style="margin:0;font-size:14px;">${completionLabel}: <strong>${assignmentCompletionRate}%</strong> (${completedAssignments}/${totalAssignments})</p>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:10px 16px;background-color:${overdueColor.bg};border-left:4px solid ${overdueColor.border};">
                    <p style="margin:0;font-size:14px;">${overdueLabel}: <strong>${overdueAssignments}</strong></p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;color:#71717a;">${classesLabel}: ${classesHtml}</p>

              <p style="margin:16px 0;font-size:16px;color:#18181b;">${closingText}</p>
              <p style="margin:0 0 24px;font-size:16px;color:#18181b;">${ctaText}</p>

              <p style="margin:0;font-size:16px;color:#18181b;">${regards}<br/>${senderName}<br/>${centerName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f4f4f5;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">${footerText}</p>
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
}

export function buildInterventionEmailPreviewText(
  params: InterventionEmailParams,
  templateUsed: string,
): string {
  const {
    locale,
    attendanceRate,
    attendedSessions,
    totalSessions,
    assignmentCompletionRate,
    completedAssignments,
    totalAssignments,
    overdueAssignments,
    healthStatus,
    classes,
  } = params;

  const studentName = params.studentName;
  const centerName = params.centerName;
  const senderName = params.senderName;

  const intro = buildIntro({ templateUsed, studentName, centerName, locale });
  const greeting = locale === "vi" ? "Xin chao," : "Hi,";

  const attendanceLabel = locale === "vi" ? "Di hoc" : "Attendance";
  const completionLabel =
    locale === "vi" ? "Hoan thanh bai tap" : "Assignment Completion";
  const overdueLabel =
    locale === "vi" ? "Bai tap qua han" : "Overdue Assignments";
  const classesLabel = locale === "vi" ? "Lop dang hoc" : "Enrolled Classes";

  const statusLabel =
    healthStatus === "at-risk"
      ? locale === "vi"
        ? "Co nguy co"
        : "At Risk"
      : healthStatus === "warning"
        ? locale === "vi"
          ? "Canh bao"
          : "Warning"
        : locale === "vi"
          ? "On dinh"
          : "On Track";

  const classesText =
    classes.length > 0
      ? classes.join(", ")
      : locale === "vi"
        ? "Khong co"
        : "None";

  const sessions = locale === "vi" ? "buoi" : "sessions";

  const closingText =
    locale === "vi"
      ? `${studentName} hien dang duoc danh dau la ${statusLabel} dua tren cac chi so nay. Toi rat mong duoc trao doi voi anh/chi ve cach ho tro ${studentName} tot hon.`
      : `${studentName} is currently flagged as ${statusLabel} based on these metrics. I'd love to discuss how we can work together to support them.`;

  const ctaText =
    locale === "vi"
      ? "Xin dung ngai lien he neu anh/chi muon sap xep mot cuoc trao doi."
      : "Please don't hesitate to reach out if you'd like to schedule a conversation.";

  const regards = locale === "vi" ? "Tran trong," : "Best regards,";

  return `${greeting}

${intro}

${attendanceLabel}: ${attendanceRate}% (${attendedSessions}/${totalSessions} ${sessions})
${completionLabel}: ${assignmentCompletionRate}% (${completedAssignments}/${totalAssignments})
${overdueLabel}: ${overdueAssignments}

${classesLabel}: ${classesText}

${closingText}

${ctaText}

${regards}
${senderName}
${centerName}`;
}

export function wrapPlainTextInEmailHtml(
  plainText: string,
  centerName: string,
): string {
  const paragraphs = plainText
    .split("\n\n")
    .filter((p) => p.trim())
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;color:#18181b;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("\n              ");

  const footerText = `You received this email from ${escapeHtml(centerName)}.`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:#2563EB;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${escapeHtml(centerName)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${paragraphs}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f4f4f5;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">${footerText}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
