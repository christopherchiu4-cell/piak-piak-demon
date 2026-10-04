import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./styles.css";
import "./interaction.css";
import "./portal.css";
import "./editor.css";
import "./login.css";

export const metadata: Metadata = {
  title: "Tutor Desk",
  description: "Class plans, classwork, and homework for one-to-one tutoring.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
