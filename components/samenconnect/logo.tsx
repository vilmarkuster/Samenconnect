import Image from "next/image";

export function SamenConnectLogo() {
  return (
    <a href="/zorenta/dashboard" className="flex items-center gap-2">
      <Image
        src="/branding/samenconnect-logo.png"
        alt="SamenConnect"
        width={36}
        height={36}
        priority
      />
      <span className="text-lg font-semibold text-slate-800">
        SamenConnect
      </span>
    </a>
  );
}

