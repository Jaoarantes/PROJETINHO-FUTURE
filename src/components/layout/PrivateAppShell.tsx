import AppShell from './AppShell';
import PrivateRoute from './PrivateRoute';

export default function PrivateAppShell() {
  return (
    <PrivateRoute>
      <AppShell />
    </PrivateRoute>
  );
}
