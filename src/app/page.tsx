import { StartCheckin } from '@/components/checkin/StartCheckin';
import { PageShell } from '@/components/layout/PageShell';

export default function Home() {
  return (
    <PageShell variant="patient">
      <StartCheckin />
    </PageShell>
  );
}
