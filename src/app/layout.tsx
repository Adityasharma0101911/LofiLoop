import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LofiLoop - Browser-Based Beat Maker",
  description: "Build chill lofi beats with a step sequencer, synthesized drums, and a subtractive synth. Shape sounds with knobs, save your loops, and vibe out.",
  keywords: ["lofi", "beat maker", "step sequencer", "web audio", "synthesizer", "music production"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
