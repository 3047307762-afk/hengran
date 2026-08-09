import { NextResponse } from "next/server";

const fallbackSupabaseUrl = "https://ibqldrhwxigsxbqjnrbu.supabase.co";
const fallbackSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlicWxkcmh3eGlnc3hicWpucmJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyMzQ3ODQsImV4cCI6MjEwMTgxMDc4NH0.ViGr54uCt6VrmZS42K8d40u-htliHia4u6Pq8WEyAZA";

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackSupabaseUrl,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey
  });
}
