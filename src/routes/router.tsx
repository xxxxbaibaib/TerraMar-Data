import { createBrowserRouter, Navigate } from 'react-router-dom'
import { SiteLayout } from '../components/layout/SiteLayout'
import { AuthProvider } from '../lib/auth/AuthContext'
import { AboutPage } from '../pages/AboutPage'
import { AccountLayout } from '../pages/account/AccountLayout'
import { AccountPage } from '../pages/AccountPage'
import { AccountAddressesPage } from '../pages/account/modules/AccountAddressesPage'
import { AccountCoursesPage } from '../pages/account/modules/AccountCoursesPage'
import { AccountFootprintPage } from '../pages/account/modules/AccountFootprintPage'
import { AccountOrderDetailPage } from '../pages/account/modules/AccountOrderDetailPage'
import { AccountOrdersPage } from '../pages/account/modules/AccountOrdersPage'
import { AccountProfilePage } from '../pages/account/modules/AccountProfilePage'
import { AccountSecurityPage } from '../pages/account/modules/AccountSecurityPage'
import { AccountSupportPage } from '../pages/account/modules/AccountSupportPage'
import { AccountTasksPage } from '../pages/account/modules/AccountTasksPage'
import { AccountWishlistPage } from '../pages/account/modules/AccountWishlistPage'
import { CooperationJoinNetworkPage } from '../pages/CooperationJoinNetworkPage'
import { CooperationPage } from '../pages/CooperationPage'
import { JoinNetworkLandingPage } from '../pages/JoinNetworkLandingPage'
import { JoinNetworkPersonalPage } from '../pages/JoinNetworkPersonalPage'
import { HomePage } from '../pages/HomePage'
import { ImpactPage } from '../pages/ImpactPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProgramDetailPage } from '../pages/ProgramDetailPage'
import { ProgramEnrollmentPage } from '../pages/ProgramEnrollmentPage'
import { ProgramsPage } from '../pages/ProgramsPage'
import { ResourceArticlePage } from '../pages/ResourceArticlePage'
import { ResourcesPage } from '../pages/ResourcesPage'
import { SciencePage } from '../pages/SciencePage'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthProvider>
        <SiteLayout />
      </AuthProvider>
    ),
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'programs', element: <ProgramsPage /> },
      { path: 'programs/:slug/enrollment', element: <ProgramEnrollmentPage /> },
      { path: 'programs/:slug', element: <ProgramDetailPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        path: 'account',
        element: <AccountLayout />,
        children: [
          { index: true, element: <AccountPage /> },
          { path: 'orders/:orderId', element: <AccountOrderDetailPage /> },
          { path: 'orders', element: <AccountOrdersPage /> },
          { path: 'profile', element: <AccountProfilePage /> },
          { path: 'security', element: <AccountSecurityPage /> },
          { path: 'addresses', element: <AccountAddressesPage /> },
          { path: 'footprint', element: <AccountFootprintPage /> },
          { path: 'tasks', element: <AccountTasksPage /> },
          { path: 'courses', element: <AccountCoursesPage /> },
          { path: 'wishlist', element: <AccountWishlistPage /> },
          { path: 'support', element: <AccountSupportPage /> },
          { path: 'cart', element: <Navigate to="/account/wishlist" replace /> },
        ],
      },
      { path: 'join-network/personal', element: <JoinNetworkPersonalPage /> },
      { path: 'join-network', element: <JoinNetworkLandingPage /> },
      { path: 'cooperation/join-network', element: <CooperationJoinNetworkPage /> },
      { path: 'cooperation', element: <CooperationPage /> },
      { path: 'impact', element: <ImpactPage /> },
      { path: 'science', element: <SciencePage /> },
      { path: 'resources/:slug', element: <ResourceArticlePage /> },
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
