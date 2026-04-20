import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("mzzpay-cookie-consent");
    if (!dismissed) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("mzzpay-cookie-consent", "accepted");
    setVisible(false);
  };
  const dismiss = () => {
    localStorage.setItem("mzzpay-cookie-consent", "dismissed");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" />
      <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-8 duration-500 max-h-[85vh] flex flex-col">
          <div className="flex items-start justify-between p-6 pb-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight font-heading">
              MzzPay gives you choice
            </h2>
            <button
              onClick={dismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 -mt-1"
              aria-label="Dismiss cookie notice"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <p className="text-[15px] text-gray-600 leading-relaxed mb-4 font-body">
              We use cookies to collect data insights, personalize your web experience, support our web functionality,
              help us understand how our websites and applications are used, and provide tailored content. Those include
              "necessary cookies" essential to optimal performance, plus functionality and analytics cookies.
            </p>
            <p className="text-[15px] text-gray-600 leading-relaxed font-body">
              Necessary cookies are always required. You may consent to other cookies for a customized experience based
              on your preferences. To learn more, please visit our{" "}
              <Link to="/cookie-policy" className="text-primary hover:underline font-medium">
                cookie policy
              </Link>
              .
            </p>
          </div>
          <div className="p-6 pt-4 space-y-3">
            <Button onClick={accept} className="w-full rounded-full h-12 text-base font-semibold">
              Accept All Cookies
            </Button>
            <Button
              variant="outline"
              onClick={dismiss}
              className="w-full border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 rounded-full h-12 text-base font-semibold"
            >
              Reject Non-Essential
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
