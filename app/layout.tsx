import type { Metadata, Viewport } from "next";
import { Archivo_Black, Caveat, Inter, Nunito, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const caveat = Caveat({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});

const editorial = Source_Serif_4({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
});

const round = Nunito({
  weight: ["700", "800"],
  subsets: ["latin"],
  variable: "--font-round",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexus — Campus OS",
  description:
    "WhatsApp groups are dead. Nexus is your campus super-app: lost & found, marketplace, doubts, referrals, events.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Nexus", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#2F5CF3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivoBlack.variable} ${inter.variable} ${caveat.variable} ${editorial.variable} ${round.variable} h-full antialiased`}
    >
      <head>
        {/* Pre-paint: mode class + custom colors + wallpaper before first
            paint so reloads never flash the wrong theme. Never throws. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=null;try{t=JSON.parse(localStorage.getItem("theme"))}catch(e){t=localStorage.getItem("theme")}if(t==="custom"||t==="dark"||t==="light")document.documentElement.classList.add(t);var p=null;try{p=JSON.parse(localStorage.getItem("nexus-custom-theme"))}catch(e){}if(p){var m={canvas:"--color-canvas",card:"--color-card",ink:"--color-ink",inkSoft:"--color-ink-soft",inkFaint:"--color-ink-faint",border:"--color-border",brand:"--color-brand"},ok=/^#[0-9a-fA-F]{6}$/;for(var k in m){if(typeof p[k]==="string"&&ok.test(p[k]))document.documentElement.style.setProperty(m[k],p[k])}}var w=null;try{w=localStorage.getItem("nexus-wallpaper")}catch(e){}if(w&&w.indexOf("data:image/jpeg")===0){var paint=function(){var b=document.body;if(!b)return;var v="color-mix(in srgb, var(--color-canvas) 66%, transparent)";b.style.backgroundImage='linear-gradient('+v+', '+v+'), url("'+w+'")';b.style.backgroundSize="cover, cover";b.style.backgroundAttachment="fixed, fixed";b.style.backgroundPosition="center, center";document.documentElement.dataset.wallpaper="on"};if(document.body)paint();else document.addEventListener("DOMContentLoaded",paint)}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={["light", "dark", "custom"]}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
