import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from "@react-email/components";
import * as React from "react";

export interface AlertEmailProps {
  alertName: string;
  alertType: string;
  marketName: string;
  conditionText: string;
  currentValue: string;
  changeText: string;
  marketUrl: string;
  appUrl?: string;
  triggeredAt?: string;
}

const TYPE_COLOR: Record<string, string> = {
  odds: "#6366f1",
  volume: "#f59e0b",
  new: "#10b981",
  arbitrage: "#ef4444",
};

const TYPE_LABEL: Record<string, string> = {
  odds: "Odds Movement",
  volume: "Volume Spike",
  new: "New Market",
  arbitrage: "Arbitrage",
};

export function AlertEmail({
  alertName,
  alertType,
  marketName,
  conditionText,
  currentValue,
  changeText,
  marketUrl,
  appUrl = "https://polys.app",
  triggeredAt,
}: AlertEmailProps) {
  const color = TYPE_COLOR[alertType] ?? "#6366f1";
  const label = TYPE_LABEL[alertType] ?? alertType;
  const timeLabel = triggeredAt
    ? new Date(triggeredAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      })
    : new Date().toUTCString();

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {alertName} — {changeText}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Text style={logoText}>Polys</Text>
            <Text style={subheadText}>Market Intelligence</Text>
          </Section>

          {/* Card */}
          <Section style={card}>
            {/* Color stripe */}
            <Section style={{ ...stripe, backgroundColor: color }} />

            <Section style={cardBody}>
              {/* Badge + Timestamp row */}
              <Row>
                <Column>
                  <Text
                    style={{
                      ...badge,
                      color,
                      backgroundColor: `${color}22`,
                      borderColor: `${color}44`,
                    }}
                  >
                    {label}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={timestampText}>{timeLabel}</Text>
                </Column>
              </Row>

              {/* Title */}
              <Heading style={alertTitle}>{alertName}</Heading>
              <Text style={marketNameText}>{marketName}</Text>

              {/* Condition */}
              <Section style={conditionBox}>
                <Text style={conditionLabel}>Condition Met</Text>
                <Text style={conditionValue}>{conditionText}</Text>
              </Section>

              {/* Metrics */}
              <Row>
                <Column style={metricBox}>
                  <Text style={metricLabel}>Current Value</Text>
                  <Text style={metricValue}>{currentValue}</Text>
                </Column>
                <Column style={metricBox}>
                  <Text style={metricLabel}>Change</Text>
                  <Text style={{ ...metricValue, color }}>{changeText}</Text>
                </Column>
              </Row>

              {/* CTA */}
              <Button style={{ ...button, backgroundColor: color }} href={marketUrl}>
                View Market
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Text style={footer}>
            You're receiving this because you set up an alert on{" "}
            <a href={appUrl} style={footerLink}>
              Polys
            </a>
            .{" "}
            <a href={`${appUrl}/alerts`} style={footerLink}>
              Manage alerts
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AlertEmail;

const body: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "40px 16px",
};

const headerSection: React.CSSProperties = {
  marginBottom: "24px",
};

const logoText: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#111827",
  letterSpacing: "-0.5px",
  margin: "0",
  display: "inline",
};

const subheadText: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  marginLeft: "8px",
  display: "inline",
};

const card: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
};

const stripe: React.CSSProperties = {
  height: "4px",
  width: "100%",
};

const cardBody: React.CSSProperties = {
  padding: "28px 32px",
};

const timestampText: React.CSSProperties = {
  fontSize: "11px",
  color: "#6b7280",
  margin: "0",
  paddingTop: "6px",
};

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "600",
  border: "1px solid",
  margin: "0 0 12px 0",
};

const alertTitle: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#111827",
  lineHeight: "1.3",
  margin: "0 0 4px 0",
};

const marketNameText: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 20px 0",
};

const conditionBox: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "20px",
};

const conditionLabel: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 8px 0",
};

const conditionValue: React.CSSProperties = {
  fontSize: "15px",
  color: "#374151",
  margin: "0",
};

const metricBox: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "14px",
  textAlign: "center",
  width: "50%",
};

const metricLabel: React.CSSProperties = {
  fontSize: "11px",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 6px 0",
};

const metricValue: React.CSSProperties = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#111827",
  margin: "0",
};

const button: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  padding: "14px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  marginTop: "24px",
  width: "100%",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#6b7280",
  textAlign: "center",
};

const footerLink: React.CSSProperties = {
  color: "#6b7280",
};
