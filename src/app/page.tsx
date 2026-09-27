import { StartCheckin } from '@/components/checkin/StartCheckin';
import { patientCopy } from '@/components/i18n/patient';
import { PageShell } from '@/components/layout/PageShell';

export default function Home() {
  const copy = patientCopy('en').home;

  return (
    <PageShell variant="patient" greeting={copy.greeting} title={copy.title}>
      <StartCheckin />
    </PageShell>
  );
}
