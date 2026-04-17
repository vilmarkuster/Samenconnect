import Image from "next/image";

export function SamenConnectLogo() {
  return (
    <a href="/dashboard" className="flex items-center gap-2" aria-label="SamenConnect">
      <Image
        src="/samenconnect-icon.png"
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0"
        priority
      />
      <span className="text-lg font-semibold leading-none tracking-tight text-slate-800">
        SamenConnect
      </span>
    </a>
  );
}

