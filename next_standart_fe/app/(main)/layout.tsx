import { headers } from "next/headers";
import Layout from "../../layout/layout";
import { routeMiddleware } from "../../lib/tools/serverTools";
import { redirect } from "next/navigation";
import { Metadata, Viewport } from "next";
import { RootLayoutProps } from "@/types/layout";
import { ConfigProvider } from "@/layout/context/configcontext";

export const viewport: Viewport = {
  initialScale: 1,
  width: 'device-width'
};

export const metadata: Metadata = {
  title: 'Standart',
  description: 'Dashboard Standart',
  robots: { index: false, follow: false },
  icons: {
    icon: '/favicon.ico'
  },
};

export default async function AppLayout({ children }: RootLayoutProps) {

  const h = await headers();
  const path = h.get("x-pathname") || "/";

  const access = await routeMiddleware(path);

  if (access === "99") redirect("/auth/login");
  if (access === "98") redirect("/auth/access");


  return <ConfigProvider>
    <Layout>{children}</Layout>
  </ConfigProvider>
}