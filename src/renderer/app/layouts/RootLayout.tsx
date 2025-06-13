import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Layout } from './layout';

export const Route = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});
