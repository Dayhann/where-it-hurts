import { PageShell } from '@/components/layout/PageShell';

export default function ClinicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PageShell variant="clinic">{children}</PageShell>;
}
