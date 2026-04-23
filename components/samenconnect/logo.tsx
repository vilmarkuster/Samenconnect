import Image from "next/image";
import Link from "next/link";

/** Public/marketing: logo → homepage. (In-app home is the top bar → `/dashboard`.) */
export function SamenConnectLogo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="SamenConnect">
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
    </Link>
  );
}

