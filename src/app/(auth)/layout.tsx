export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--bg-app)", padding: 16 }}
    >
      <div className="w-full" style={{ maxWidth: 400 }}>
        {children}
      </div>
    </div>
  );
}
