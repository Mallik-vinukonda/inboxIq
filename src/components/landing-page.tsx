"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import {
  Zap,
  Bot,
  Search,
  Layers,
  ArrowRight,
  Mail,
  Sparkles,
  ShieldCheck,
  Clock,
} from "lucide-react";

interface LandingPageProps {
  isLoggedIn: boolean;
}

export function LandingPage({ isLoggedIn }: LandingPageProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#FAFAFA] text-[#111827] selection:bg-[#4F46E5] selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-gray-200/50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111827] text-white shadow-sm transition-colors group-hover:bg-[#4F46E5]">
              <Zap className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="text-[17px] font-bold tracking-tight">
              Inbox<span className="text-[#4F46E5]">IQ</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="hidden text-sm font-medium hover:bg-gray-100 sm:inline-flex"
                  >
                    Dashboard
                  </Button>
                </Link>
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-200">
                  <UserButton
                    appearance={{
                      elements: { userButtonAvatarBox: "w-full h-full" },
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <SignInButton>
                  <Button
                    variant="ghost"
                    className="text-sm font-medium hover:bg-gray-100"
                  >
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton>
                  <Button className="rounded-full bg-[#111827] px-5 text-sm font-medium text-white shadow-sm hover:bg-[#374151]">
                    Get Started
                  </Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="relative pt-32 pb-20">
        {/* Abstract Background Shapes */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-full overflow-hidden">
          <div className="absolute -top-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] opacity-50 blur-3xl" />
          <div className="absolute top-[20%] -left-[10%] h-[40%] w-[40%] rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] opacity-50 blur-3xl" />
        </div>

        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <motion.div
            className="mx-auto mb-24 max-w-4xl text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="mb-6 flex justify-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-indigo-700 uppercase shadow-sm">
                <Sparkles className="h-3.5 w-3.5 fill-indigo-700" />
                <span>The Future of Email</span>
              </div>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mb-8 text-5xl leading-[1.1] font-extrabold tracking-tight md:text-7xl"
            >
              Control your inbox with <br />
              <span className="bg-gradient-to-r from-[#4F46E5] to-[#EC4899] bg-clip-text text-transparent">
                AI-Powered Precision
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl"
            >
              Experience the evolution of email management. Draft replies in
              seconds, find anything instantly with semantic search, and unify
              your accounts in one beautiful, intelligent workspace.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              {isLoggedIn ? (
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="group w-full rounded-full bg-[#4F46E5] px-8 py-6 text-base text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 hover:bg-[#4338CA] active:scale-95 sm:w-auto"
                  >
                    Enter Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <SignUpButton>
                    <Button
                      size="lg"
                      className="group w-full rounded-full bg-[#4F46E5] px-8 py-6 text-base text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 hover:bg-[#4338CA] active:scale-95 sm:w-auto"
                    >
                      Start for free
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </SignUpButton>
                  <SignInButton>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full rounded-full border-gray-300 px-8 py-6 text-base transition-all hover:bg-gray-50 sm:w-auto"
                    >
                      Sign In
                    </Button>
                  </SignInButton>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* App Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, type: "spring" }}
            className="relative mx-auto mb-32 max-w-5xl"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#4F46E5]/10 to-transparent blur-2xl" />
            <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-4 shadow-2xl shadow-indigo-900/5 md:p-6">
              {/* Fake Mac OS Header */}
              <div className="mb-4 flex w-full items-center justify-start gap-2 border-b border-gray-100 pb-4">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex flex-1 justify-center text-xs font-medium text-gray-400">
                  InboxIQ Workspace
                </div>
              </div>
              <img
                src="/dashboard-mockup.png"
                alt="InboxIQ Dashboard Preview"
                className="h-[450px] w-full rounded-xl border border-gray-200/50 object-cover object-top shadow-inner"
              />
            </div>
          </motion.div>

          {/* Features Section */}
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Everything you need to work faster
              </h2>
              <p className="mx-auto max-w-2xl text-gray-500">
                Built specifically designed to eliminate the friction from your
                daily inbox review. Let the AI do the heavy lifting while you
                focus on what really matters.
              </p>
            </div>

            <motion.div
              className="grid gap-8 md:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={containerVariants}
            >
              {[
                {
                  icon: <Bot className="h-6 w-6 text-indigo-600" />,
                  bg: "bg-indigo-50 border-indigo-100",
                  title: "AI Composition",
                  desc: "Draft complex replies instantly. Choose your tone, length, and let our multi-provider AI strictly follow your context.",
                },
                {
                  icon: <Search className="h-6 w-6 text-emerald-600" />,
                  bg: "bg-emerald-50 border-emerald-100",
                  title: "Smart Semantic Search",
                  desc: "Powered by Orama. Don't remember the exact keywords? Just search contextually like 'that invoice from last week'.",
                },
                {
                  icon: <Layers className="h-6 w-6 text-purple-600" />,
                  bg: "bg-purple-50 border-purple-100",
                  title: "Unified Workspace",
                  desc: "Connect multiple Gmail accounts and view all your threads in one lightning-fast, highly optimized interface.",
                },
                {
                  icon: <Clock className="h-6 w-6 text-amber-600" />,
                  bg: "bg-amber-50 border-amber-100",
                  title: "Schedule Send",
                  desc: "Compose now, send later. Our serverless cron job infrastructure guarantees your emails hit their inbox exactly on time.",
                },
                {
                  icon: <ShieldCheck className="h-6 w-6 text-rose-600" />,
                  bg: "bg-rose-50 border-rose-100",
                  title: "Secure & Private",
                  desc: "Your data is encrypted. We use Clerk for state-of-the-art authentication and strict OAuth scopes for Gmail API access.",
                },
                {
                  icon: <Mail className="h-6 w-6 text-blue-600" />,
                  bg: "bg-blue-50 border-blue-100",
                  title: "Infinite Scroll",
                  desc: "Fly through thousands of emails with smooth, hardware-accelerated pagination powered by TanStack Query.",
                },
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50"
                >
                  <div
                    className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl border ${feature.bg}`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="container mx-auto flex flex-col items-center justify-between px-6 md:flex-row">
          <div className="mb-4 flex items-center gap-2 opacity-80 md:mb-0">
            <Zap className="h-4 w-4 text-gray-900" />
            <span className="font-semibold text-gray-900">InboxIQ</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} InboxIQ. All rights reserved. Built for
            modern productivity.
          </p>
        </div>
      </footer>
    </div>
  );
}
