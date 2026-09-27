import { patientCopy } from '@/components/i18n/patient';
import { PageShell } from '@/components/layout/PageShell';

export default function PatientLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const copy = patientCopy('en').home;

  return (
    <PageShell variant="patient" greeting={copy.greeting} title={copy.title}>
      {children}
    </PageShell>
  );
}
