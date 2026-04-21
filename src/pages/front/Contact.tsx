import { useState } from "react";
import { motion } from "framer-motion";
import { FrontHeader } from "@/components/front/FrontHeader";
import { FrontFooter } from "@/components/front/FrontFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const PRIMARY = "hsl(172 72% 48%)";

const offices = [
  { city: "London", address: "123 Old Street, EC1V 9NR, United Kingdom" },
  { city: "New York", address: "350 5th Avenue, NY 10118, United States" },
  { city: "Singapore", address: "1 Raffles Place, #20-61, 048616 Singapore" },
];

const channels = [
  { icon: Mail, label: "Email", value: "hello@mzzpay.com", href: "mailto:hello@mzzpay.com" },
  { icon: Phone, label: "Phone", value: "+1 (415) 555-0142", href: "tel:+14155550142" },
  { icon: MessageSquare, label: "Live chat", value: "24/7 in-app chat", href: "/help" },
];

export default function Contact() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setDone(true);
    toast.success("Thanks — our team will reach out within one business day.");
  };

  return (
    <div className="min-h-screen bg-white">
      <FrontHeader />
      <main className="pt-[68px]">
        {/* Hero */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
          <div className="container mx-auto px-6 text-center max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 font-heading"
            >
              Let's <span style={{ color: PRIMARY }}>talk</span>
            </motion.h1>
            <p className="text-lg text-white/70 font-body">
              Whether you're scaling globally or just getting started, our team is here to help.
            </p>
          </div>
        </section>

        {/* Form + channels */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="grid lg:grid-cols-5 gap-12">
              {/* Form */}
              <div className="lg:col-span-3">
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2 font-heading">Send us a message</h2>
                <p className="text-sm text-gray-600 mb-8 font-body">
                  We respond within one business day, often much sooner.
                </p>

                {done ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3" style={{ color: PRIMARY }} />
                    <h3 className="text-lg font-bold text-gray-900 mb-2 font-heading">Message sent</h3>
                    <p className="text-sm text-gray-600 font-body">
                      Thanks — we'll be in touch within one business day.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="font-body">Full name</Label>
                        <Input
                          id="name"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="rounded-xl mt-2 h-12"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="font-body">Work email</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="rounded-xl mt-2 h-12"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="company" className="font-body">Company</Label>
                      <Input
                        id="company"
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        className="rounded-xl mt-2 h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="message" className="font-body">How can we help?</Label>
                      <Textarea
                        id="message"
                        required
                        rows={5}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="rounded-xl mt-2"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="rounded-full h-12 px-8 text-white font-bold"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send message"}
                    </Button>
                  </form>
                )}
              </div>

              {/* Channels */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2 font-heading">Other ways to reach us</h2>
                {channels.map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    className="flex items-start gap-4 p-5 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all bg-white"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${PRIMARY}1A` }}
                    >
                      <c.icon className="h-4 w-4" style={{ color: PRIMARY }} />
                    </div>
                    <div className="font-body">
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{c.label}</div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">{c.value}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Offices */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6 max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-12 text-center font-heading">
              Global offices
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {offices.map((o) => (
                <div key={o.city} className="bg-white rounded-2xl p-7 border border-gray-200">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${PRIMARY}1A` }}
                  >
                    <MapPin className="h-5 w-5" style={{ color: PRIMARY }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 font-heading">{o.city}</h3>
                  <p className="text-sm text-gray-600 font-body">{o.address}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <FrontFooter />
    </div>
  );
}
