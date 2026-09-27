import { PageShell } from '@/components/layout/PageShell';

export default function PatientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PageShell variant="patient">{children}</PageShell>;
}
