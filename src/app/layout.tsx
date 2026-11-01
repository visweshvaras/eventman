import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventGenie - Your Personal AI Event Planner",
  description:
    "Plan weddings, birthdays, and unforgettable celebrations with your personal AI event planner.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
