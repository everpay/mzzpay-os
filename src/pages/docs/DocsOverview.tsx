import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const categories = [
  {
    title: "Payments",
    links: [
      { label: "Accept payments online", to: "/docs/api/payments" },
      { label: "Manage customers", to: "/docs/api/customers" },
      { label: "Listen for webhooks", to: "/docs/webhooks" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Quick start guide", to: "/docs/quick-start" },
      { label: "Manage API keys", to: "/docs/api-keys" },
      { label: "Download an SDK", to: "/docs/sdks" },
    ],
  },
  {
    title: "Security",
    links: [
      { label: "Authentication", to: "/docs/api/authentication" },
      { label: "Webhook signatures", to: "/docs/webhooks" },
      { label: "Key rotation", to: "/docs/api-keys" },
    ],
  },
];

const tryItItems = [
  { label: "Create a payment", to: "/docs/api/payments" },
  { label: "Create a customer", to: "/docs/api/customers" },
  { label: "Set up webhooks", to: "/docs/webhooks" },
  { label: "Generate an API key", to: "/docs/api-keys" },
];

export default function DocsOverview() {
  return (
    <div className="max-w-4xl space-y-12">
      <div className="space-y-3">
        <h1 className="text-[2.5rem] font-heading font-semibold tracking-tight leading-[1.1]">Documentation</h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
          Explore guides and reference docs to integrate MzzPay into your platform.
        </p>
        <div className="flex items-center gap-4 pt-3">
          <Link
            to="/docs/quick-start"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started with MzzPay
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/docs/api/payments" className="text-sm text-primary font-medium hover:underline">
            Explore the API
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2">
        {categories.map((cat) => (
          <div key={cat.title}>
            <h3 className="text-base font-semibold mb-3">{cat.title}</h3>
            <div className="space-y-2">
              {cat.links.map((link) => (
                <Link key={link.to} to={link.to} className="block text-sm text-primary hover:underline">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <h2 className="text-xl font-semibold mb-4">Try it out</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-border rounded-lg overflow-hidden">
          <div className="divide-y divide-border">
            {tryItItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between px-5 py-3.5 text-sm text-foreground hover:bg-muted/50 transition-colors group"
              >
                {item.label}
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
          <div className="bg-muted/30 p-5 border-l border-border font-mono text-xs leading-relaxed text-foreground">
            <pre>{`$ curl https://api.mzzpay.io/v1/payments \\
  -H "Authorization: Bearer sk_test_..." \\
  -d amount=5000 \\
  -d currency=usd

{
  "id": "pay_1abc2def",
  "object": "payment",
  "amount": 5000,
  "currency": "usd",
  "status": "succeeded"
}`}</pre>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg p-5 bg-card">
        <h4 className="text-sm font-semibold mb-2">Base URL</h4>
        <code className="inline-block bg-muted px-3 py-1.5 rounded text-sm font-mono">
          https://api.mzzpay.io/v1
        </code>
        <p className="text-sm text-muted-foreground mt-3">
          All API requests require a Bearer token in the{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded border border-border">Authorization</code> header.
        </p>
      </div>
    </div>
  );
}
