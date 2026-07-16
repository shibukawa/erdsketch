import { CircleCheck } from "lucide-react";

export function CoworkClosedScreen() {
  return <main className="flex h-screen items-center justify-center bg-slate-100 p-6 text-slate-950"><section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl"><CircleCheck className="mx-auto text-emerald-600" size={36} /><h1 className="mt-4 text-xl font-bold">Co-work workspace closed</h1><p className="mt-2 text-sm text-slate-600">The recovery copy was removed. You can close this browser tab safely.</p></section></main>;
}
