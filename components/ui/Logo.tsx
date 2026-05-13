import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
  showText?: boolean;
}

export default function Logo({ 
  className = "", 
  width = 40, 
  height = 40,
  showText = true 
}: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/images/logo.png"
        alt="QurbaniSathi Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-bold text-primary tracking-tight">
            QurbaniSathi
          </span>
          <span className="text-[10px] font-semibold text-accent -mt-0.5">
            কোরবানি সাথী
          </span>
        </div>
      )}
    </Link>
  );
}
