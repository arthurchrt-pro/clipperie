import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Footer } from "@/components/Footer";
import { SITE, siteUrl } from "@/lib/site";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE.name} — ${SITE.promise}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f1e6",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-clip">
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
