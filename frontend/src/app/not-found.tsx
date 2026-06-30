import { headers } from "next/headers";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import {
  Search,
  Activity,
  Calendar,
  Clipboard,
  MessageSquare,
  ShieldAlert,
  User as UserIcon,
  MapPinned,
  ChevronRight,
  HelpCircle,
  LogIn,
  Home
} from "lucide-react";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export default async function NotFound() {
  const headersList = await headers();
  const path = headersList.get("x-pathname") || "";

  // 1. Fetch contextual metadata from Django anonymously
  let backendData: any = null;
  try {
    const backendUrl = `${API_BASE_URL}/system/not-found-context/?path=${encodeURIComponent(path)}`;
    const response = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (response.ok) {
      backendData = await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch context inside not-found.tsx", error);
  }

  // 2. Fetch session information server-side
  let signedIn = false;
  try {
    const session = await getSessionUser();
    signedIn = session.signedIn;
  } catch (error) {
    console.error("Failed to read session user inside not-found.tsx", error);
  }

  // 3. Setup context with fallback values
  const context = {
    module: backendData?.module || "general",
    eyebrow: backendData?.eyebrow || "Harmony MIS",
    title: backendData?.title || "This page is not on the current map",
    message: backendData?.message || "The link may be old, incomplete, or no longer part of the MIS workspace.",
    primary_label: backendData?.primary_label || "Go to dashboard",
    primary_href: backendData?.primary_href || "/",
    login_href: backendData?.login_href || `/login?redirect=${encodeURIComponent(path || "/")}`,
    dashboard_href: backendData?.dashboard_href || "/",
    support_label: backendData?.support_label || "Contact support",
    support_href: backendData?.support_href || "/administration/support-tickets",
    requested_path: path,
  };

  // 4. Map module names to context-rich clinical icons
  const getIcon = (moduleName: string) => {
    const baseClass = "w-10 h-10";
    switch (moduleName) {
      case "patients":
        return <Search className={`${baseClass} text-[#7030A0]`} />;
      case "patient-flow":
        return <Activity className={`${baseClass} text-[#2E7D32]`} />;
      case "appointments":
        return <Calendar className={`${baseClass} text-blue-600`} />;
      case "check-ins":
        return <Clipboard className={`${baseClass} text-teal-600`} />;
      case "messages":
        return <MessageSquare className={`${baseClass} text-indigo-600`} />;
      case "administration":
        return <ShieldAlert className={`${baseClass} text-amber-600`} />;
      case "account":
        return <UserIcon className={`${baseClass} text-violet-600`} />;
      default:
        return <MapPinned className={`${baseClass} text-slate-500`} />;
    }
  };

  // 5. Select visual background wrapper classes based on the module
  const getModuleIconBgClass = (moduleName: string) => {
    switch (moduleName) {
      case "patients":
        return "bg-purple-50 border border-purple-100";
      case "patient-flow":
        return "bg-emerald-50 border border-emerald-100";
      case "appointments":
        return "bg-blue-50 border border-blue-100";
      case "check-ins":
        return "bg-teal-50 border border-teal-100";
      case "messages":
        return "bg-indigo-50 border border-indigo-100";
      case "administration":
        return "bg-amber-50 border border-amber-100";
      case "account":
        return "bg-violet-50 border border-violet-100";
      default:
        return "bg-slate-50 border border-slate-100";
    }
  };

  const iconBgTheme = getModuleIconBgClass(context.module);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F3F8F4] px-4 py-12">
      {/* Centered Constrained Section */}
      <div className="max-w-md w-full">
        
        {/* Restrained Clinical Panel */}
        <div className="bg-white border border-[#B8CABE] rounded-lg shadow-sm p-8 text-center">
          
          {/* Module Icon Wrapper */}
          <div className="inline-flex justify-center items-center mb-5">
            <div className={`p-4 rounded-full ${iconBgTheme}`}>
              {getIcon(context.module)}
            </div>
          </div>

          {/* Clear Operational 404 Badge */}
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700">
              404 - Not Found
            </span>
          </div>

          {/* Contextual Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-[#2B2F38] tracking-tight mb-3">
            {context.title}
          </h1>

          {/* Contextual Clinical Message */}
          <p className="text-sm text-[#53605a] leading-relaxed mb-6">
            {context.message}
          </p>

          {/* Quiet Monospace Path Row */}
          {path && (
            <div className="mb-6 p-2 rounded bg-slate-50 border border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 text-left">
                Requested Location
              </div>
              <code className="block text-xs font-mono text-slate-600 text-left overflow-x-auto select-all whitespace-nowrap">
                {path}
              </code>
            </div>
          )}

          {/* Primary/Secondary Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {signedIn ? (
              <>
                <Link 
                  href={context.primary_href} 
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] px-5 rounded-md bg-[#7030A0] hover:bg-[#481D64] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  {context.primary_label}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                
                <Link 
                  href={context.dashboard_href}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] px-5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-[#B8CABE] text-xs font-bold transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-slate-500" />
                  Return to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href={context.login_href}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] px-5 rounded-md bg-[#7030A0] hover:bg-[#481D64] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in to continue
                </Link>

                <Link 
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[2.5rem] px-5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-[#B8CABE] text-xs font-bold transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-400" />
                  Go to Login Screen
                </Link>
              </>
            )}
          </div>

        </div>

        {/* Subtle Support Link Footer */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>{context.support_label}?</span>
            <Link href={context.support_href} className="text-[#7030A0] underline hover:text-[#481D64] transition-colors font-semibold">
              Get assistance
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
